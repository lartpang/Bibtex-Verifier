/*
 * BibLib — pure logic functions for BibSentry.
 * Works as a browser global (window.BibLib) and as a Node.js module.
 */
(function (exports) {
  "use strict";

  // ─── Configuration ───────────────────────────────────────────────────
  const TITLE_MATCH_THRESHOLD = 85;
  const MIN_TITLE_SIM = 70;
  const COMPARED_FIELDS = [
    "author", "year", "journal", "booktitle",
    "volume", "number", "pages", "doi", "publisher",
  ];
  const FORMAT_INSENSITIVE_FIELDS = [
    ...COMPARED_FIELDS,
    "title", "url", "doi_url", "howpublished", "note", "series",
    "school", "institution", "organization", "address", "edition",
    "type", "month", "issn", "isbn", "eprint", "archiveprefix",
    "primaryclass", "archive", "urldate",
  ];
  const FORMAT_INSENSITIVE_FIELD_SET = new Set(FORMAT_INSENSITIVE_FIELDS);

  const DEFAULT_CONFIG = {
    thresholds: {
      titleStrong: TITLE_MATCH_THRESHOLD,
      titleCandidate: MIN_TITLE_SIM,
      authorStrong: 70,
      identityStrong: 75,
    },
  };

  const MONTH_STRINGS = {
    jan: "January", feb: "February", mar: "March", apr: "April",
    may: "May", jun: "June", jul: "July", aug: "August",
    sep: "September", oct: "October", nov: "November", dec: "December",
  };

  // ─── LaTeX helpers ───────────────────────────────────────────────────
  const LATEX_ACCENT_MAP = {
    "\\'a":"á", "\\'e":"é", "\\'i":"í", "\\'o":"ó", "\\'u":"ú",
    "\\`a":"à", "\\`e":"è", "\\`i":"ì", "\\`o":"ò", "\\`u":"ù",
    '\\"a':"ä", '\\"e':"ë", '\\"i':"ï", '\\"o':"ö", '\\"u':"ü",
    "\\~n":"ñ", "\\~a":"ã", "\\~o":"õ",
    "\\^a":"â", "\\^e":"ê", "\\^i":"î", "\\^o":"ô", "\\^u":"û",
    "\\c{c}":"ç", "\\c c":"ç", "{\\ss}":"ß",
  };

  function stripLatex(text) {
    if (!text) return "";
    for (const [latex, ch] of Object.entries(LATEX_ACCENT_MAP))
      text = text.replaceAll(latex, ch);
    text = text.replace(/\\[a-zA-Z]+\s*/g, "");
    text = text.replace(/[{}]/g, "");
    return text.replace(/\s+/g, " ").trim();
  }

  function normalizeTitle(title) {
    return stripLatex(title).toLowerCase().trim();
  }

  function normalizeFieldName(field) {
    return String(field || "").toLowerCase();
  }

  function isFormatInsensitiveField(field) {
    return FORMAT_INSENSITIVE_FIELD_SET.has(normalizeFieldName(field));
  }

  // ─── BibTeX parser / serializer ──────────────────────────────────────
  function skipWhitespace(str, i) {
    while (i < str.length && /\s/.test(str[i])) i++;
    return i;
  }

  /** Append missing `}` so nested `{...}` recover from typos like `{{Foo},` before next field. */
  function balanceClosingBraces(s) {
    let net = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "{") net++;
      else if (s[i] === "}") net--;
    }
    let out = s;
    while (net > 0) {
      out += "}";
      net--;
    }
    return out;
  }

  /**
   * Parse `{...}` with nested-brace awareness. If the user omits the closing `}` before `,`
   * and the next token looks like another field (`title =`), treat the comma as the field
   * separator and repair inner braces (common with `{{GitHub},` typos).
   */
  function extractBracedFieldValue(str, start) {
    if (str[start] !== "{") return { value: "", next: start };
    let i = start + 1;
    let depth = 1;
    while (i < str.length && depth > 0) {
      const c = str[i];
      if (c === "{") {
        depth++;
        i++;
      } else if (c === "}") {
        depth--;
        i++;
        if (depth === 0) {
          const inner = str.slice(start + 1, i - 1);
          let next = skipWhitespace(str, i);
          if (str[next] === ",") next = skipWhitespace(str, next + 1);
          return { value: inner, next };
        }
      } else if (depth === 1 && c === ",") {
        const tail = str.slice(i + 1);
        if (/^\s*(?:\r?\n\s*)?\w+\s*=/.test(tail)) {
          const inner = str.slice(start + 1, i);
          return {
            value: balanceClosingBraces(inner),
            next: skipWhitespace(str, i + 1),
          };
        }
        i++;
      } else {
        i++;
      }
    }
    const inner = str.slice(start + 1);
    return { value: balanceClosingBraces(inner), next: str.length };
  }

  function extractQuotedFieldValue(str, start) {
    if (str[start] !== '"') return { value: "", next: start };
    let i = start + 1;
    let buf = "";
    while (i < str.length) {
      const c = str[i];
      if (c === "\\" && i + 1 < str.length) {
        buf += str[i + 1];
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        let next = skipWhitespace(str, i);
        if (str[next] === ",") next = skipWhitespace(str, next + 1);
        return { value: buf, next };
      }
      buf += c;
      i++;
    }
    return { value: buf, next: str.length };
  }

  function extractNumberFieldValue(str, start) {
    const m = /^(\d+)/.exec(str.slice(start));
    if (!m) return { value: "", next: start };
    let next = start + m[1].length;
    next = skipWhitespace(str, next);
    if (str[next] === ",") next = skipWhitespace(str, next + 1);
    return { value: m[1], next };
  }

  function skipBibSpace(str, i) {
    while (i < str.length) {
      if (/\s/.test(str[i])) { i++; continue; }
      if (str[i] === "%") {
        while (i < str.length && str[i] !== "\n") i++;
        continue;
      }
      break;
    }
    return i;
  }

  function makeDiagnostic(severity, message, ctx = {}) {
    return { severity, message, ...ctx };
  }

  function findEnclosedEnd(str, openIndex, diagnostics, ctx = {}) {
    const open = str[openIndex];
    const close = open === "{" ? "}" : ")";
    let depth = 1;
    let i = openIndex + 1;
    let inQuote = false;
    while (i < str.length) {
      const c = str[i];
      if (c === "\\" && i + 1 < str.length) { i += 2; continue; }
      if (c === '"' && open === "{") { inQuote = !inQuote; i++; continue; }
      if (!inQuote && c === open) depth++;
      else if (!inQuote && c === close) {
        depth--;
        if (depth === 0) return i;
      }
      i++;
    }
    diagnostics.push(makeDiagnostic("error", `Unclosed @${ctx.itemType || "entry"} block.`, ctx));
    return -1;
  }

  function findTopLevelComma(str) {
    let depth = 0, inQuote = false;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === "\\" && i + 1 < str.length) { i++; continue; }
      if (c === '"') { inQuote = !inQuote; continue; }
      if (inQuote) continue;
      if (c === "{") depth++;
      else if (c === "}") depth = Math.max(0, depth - 1);
      else if (c === "," && depth === 0) return i;
    }
    return -1;
  }

  function parseBracedValueStrict(str, start, diagnostics, ctx) {
    let i = start + 1, depth = 1, value = "";
    while (i < str.length) {
      const c = str[i];
      if (c === "{") { depth++; value += c; i++; continue; }
      if (c === "}") {
        depth--;
        if (depth === 0) return { ast: { kind: "braced", value }, next: i + 1 };
        value += c; i++; continue;
      }
      value += c; i++;
    }
    diagnostics.push(makeDiagnostic("error", `Unclosed braced value for ${ctx.field || "field"}.`, ctx));
    return { ast: { kind: "braced", value }, next: str.length };
  }

  function parseQuotedValueStrict(str, start, diagnostics, ctx) {
    let i = start + 1, value = "";
    while (i < str.length) {
      const c = str[i];
      if (c === "\\" && i + 1 < str.length) {
        value += c + str[i + 1];
        i += 2;
        continue;
      }
      if (c === '"') return { ast: { kind: "quoted", value }, next: i + 1 };
      value += c; i++;
    }
    diagnostics.push(makeDiagnostic("error", `Unclosed quoted value for ${ctx.field || "field"}.`, ctx));
    return { ast: { kind: "quoted", value }, next: str.length };
  }

  function parseValueTerm(str, start, diagnostics, ctx) {
    let i = skipBibSpace(str, start);
    const c = str[i];
    if (c === "{") return parseBracedValueStrict(str, i, diagnostics, ctx);
    if (c === '"') return parseQuotedValueStrict(str, i, diagnostics, ctx);
    const num = /^[-+]?\d+/.exec(str.slice(i));
    if (num) return { ast: { kind: "number", value: num[0] }, next: i + num[0].length };
    const ident = /^[A-Za-z_][A-Za-z0-9_:\-.]*/.exec(str.slice(i));
    if (ident) return { ast: { kind: "identifier", value: ident[0] }, next: i + ident[0].length };
    diagnostics.push(makeDiagnostic("error", `Invalid value for ${ctx.field || "field"}.`, ctx));
    return { ast: { kind: "invalid", value: "" }, next: Math.min(i + 1, str.length) };
  }

  function parseValueExpression(str, start, diagnostics, ctx) {
    const parts = [];
    let i = start;
    while (i < str.length) {
      const term = parseValueTerm(str, i, diagnostics, ctx);
      parts.push(term.ast);
      i = skipBibSpace(str, term.next);
      if (str[i] !== "#") break;
      i = skipBibSpace(str, i + 1);
      if (i >= str.length || str[i] === "," || str[i] === "}") {
        diagnostics.push(makeDiagnostic("error", `Dangling # concatenation for ${ctx.field || "field"}.`, ctx));
        break;
      }
    }
    return { ast: parts.length === 1 ? parts[0] : { kind: "concat", parts }, next: i };
  }

  function parseFieldsStrict(body, entryId, diagnostics) {
    const fields = [];
    let i = 0;
    while (i < body.length) {
      i = skipBibSpace(body, i);
      if (body[i] === ",") { i++; continue; }
      if (i >= body.length) break;

      const name = /^([A-Za-z][A-Za-z0-9_\-]*)\s*=/.exec(body.slice(i));
      if (!name) {
        const rest = body.slice(i).trim();
        if (rest) diagnostics.push(makeDiagnostic("error", `Cannot parse field near "${rest.slice(0, 40)}".`, { entry_id: entryId }));
        break;
      }

      const field = name[1].toLowerCase();
      i += name[0].length;
      const value = parseValueExpression(body, i, diagnostics, { entry_id: entryId, field });
      fields.push({ name: field, valueAst: value.ast });
      i = skipBibSpace(body, value.next);
      if (body[i] === ",") i++;
    }
    return fields;
  }

  function parseStringDefinition(body, diagnostics) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_:\-.]*)\s*=/.exec(body);
    if (!m) {
      diagnostics.push(makeDiagnostic("error", "Cannot parse @string definition.", { item_type: "string" }));
      return null;
    }
    const name = m[1].toLowerCase();
    const value = parseValueExpression(body, m[0].length, diagnostics, { item_type: "string", field: name });
    return { name, valueAst: value.ast };
  }

  function parseBibItems(raw) {
    const diagnostics = [];
    const items = [];
    let i = 0;
    while (i < raw.length) {
      const at = raw.indexOf("@", i);
      if (at === -1) break;
      const typeMatch = /^@([A-Za-z]+)\s*/.exec(raw.slice(at));
      if (!typeMatch) { i = at + 1; continue; }
      const itemType = typeMatch[1].toLowerCase();
      let open = at + typeMatch[0].length;
      open = skipBibSpace(raw, open);
      if (raw[open] !== "{" && raw[open] !== "(") {
        diagnostics.push(makeDiagnostic("error", `@${itemType} is missing an opening brace.`, { item_type: itemType }));
        i = open + 1;
        continue;
      }
      const end = findEnclosedEnd(raw, open, diagnostics, { itemType });
      if (end === -1) break;
      const body = raw.slice(open + 1, end);
      const item = { itemtype: itemType, raw: raw.slice(at, end + 1), start: at, end: end + 1 };

      if (itemType === "string") {
        const def = parseStringDefinition(body, diagnostics);
        if (def) Object.assign(item, def);
      } else if (itemType === "preamble" || itemType === "comment") {
        item.value = body;
      } else {
        const comma = findTopLevelComma(body);
        if (comma === -1) {
          diagnostics.push(makeDiagnostic("error", `Entry @${itemType} is missing a citation key or field comma.`, { item_type: itemType }));
        } else {
          item.type = itemType;
          item.key = body.slice(0, comma).trim();
          item.fields = parseFieldsStrict(body.slice(comma + 1), item.key, diagnostics);
          item.itemtype = "entry";
        }
      }
      items.push(item);
      i = end + 1;
    }
    return { items, diagnostics };
  }

  function resolveBibValue(valueAst, strings = {}, diagnostics = [], ctx = {}, preserveWhitespace = false) {
    if (!valueAst) return "";
    if (valueAst.kind === "concat")
      return valueAst.parts.map(p => resolveBibValue(p, strings, diagnostics, ctx, true)).join("").trim();
    if (valueAst.kind === "braced" || valueAst.kind === "quoted" || valueAst.kind === "number")
      return preserveWhitespace
        ? String(valueAst.value ?? "").replace(/\s*\n\s*/g, " ")
        : String(valueAst.value ?? "").replace(/\s*\n\s*/g, " ").trim();
    if (valueAst.kind === "identifier") {
      const key = String(valueAst.value || "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(strings, key)) return strings[key];
      if (Object.prototype.hasOwnProperty.call(MONTH_STRINGS, key)) return MONTH_STRINGS[key];
      diagnostics.push(makeDiagnostic("error", `Unknown BibTeX macro "${valueAst.value}".`, ctx));
      return String(valueAst.value || "");
    }
    diagnostics.push(makeDiagnostic("error", `Invalid BibTeX value for ${ctx.field || "field"}.`, ctx));
    return "";
  }

  function buildStringTable(items, diagnostics) {
    const strings = { ...MONTH_STRINGS };
    for (const item of items) {
      if (item.itemtype !== "string" || !item.name) continue;
      const value = resolveBibValue(item.valueAst, strings, diagnostics, { item_type: "string", field: item.name });
      if (!Object.prototype.hasOwnProperty.call(strings, item.name) || isMoreCompleteStringValue(value, strings[item.name]))
        strings[item.name] = value;
    }
    return strings;
  }

  function isMoreCompleteStringValue(candidate, current) {
    const c = normalizeText(candidate || "");
    const old = normalizeText(current || "");
    if (!old) return true;
    if (!c) return false;
    if (c === old) return false;
    const cWords = c.split(/\s+/).filter(Boolean).length;
    const oldWords = old.split(/\s+/).filter(Boolean).length;
    if (cWords !== oldWords) return cWords > oldWords;
    return c.length > old.length;
  }

  function parseBibDocument(raw, config = {}) {
    const parsed = parseBibItems(raw || "");
    const diagnostics = parsed.diagnostics.slice();
    const strings = buildStringTable(parsed.items, diagnostics);
    const entries = [];

    for (const item of parsed.items) {
      if (item.itemtype !== "entry") continue;
      const entry = {
        ENTRYTYPE: item.type || "misc",
        ID: item.key || "",
        _raw: item.raw || "",
        _sourceStart: item.start,
        _sourceEnd: item.end,
        _fieldsAst: item.fields || [],
      };
      for (const field of item.fields || []) {
        const resolved = resolveBibValue(field.valueAst, strings, diagnostics, {
          entry_id: item.key,
          field: field.name,
        });
        entry[field.name] = expandParsedFieldValue(field.name, resolved, strings, config);
      }
      if (!entry.ID) diagnostics.push(makeDiagnostic("error", "Entry is missing a citation key.", { entry_id: "" }));
      if (!(entry.title || "").trim())
        diagnostics.push(makeDiagnostic("warning", "Entry is missing a title, so it cannot be searched automatically.", { entry_id: entry.ID, field: "title" }));
      entries.push(entry);
    }

    if (!entries.length)
      diagnostics.push(makeDiagnostic("error", "No BibTeX entries found.", { item_type: "document" }));

    const plainBib = entriesToBib(entries);
    const ok = diagnostics.filter(d => d.severity === "error" || d.severity === "warning").length === 0;
    return { ok, raw: raw || "", plainBib, entries, strings, diagnostics, items: parsed.items, config };
  }

  function expandParsedFieldValue(fieldName, value, strings = {}, config = {}) {
    const venueFields = new Set(["journal", "booktitle", "series"]);
    if (!venueFields.has(fieldName)) return value;

    const key = String(value || "").trim().toLowerCase();
    if (key && Object.prototype.hasOwnProperty.call(strings, key) && isMoreCompleteStringValue(strings[key], value))
      return strings[key];

    return value;
  }

  function parseEntryFields(body) {
    const fields = {};
    let i = skipWhitespace(body, 0);
    while (i < body.length) {
      const nameMatch = /^(\w+)\s*=\s*/.exec(body.slice(i));
      if (!nameMatch) break;
      const key = nameMatch[1].toLowerCase();
      i += nameMatch[0].length;
      i = skipWhitespace(body, i);
      if (i >= body.length) break;

      let ext;
      if (body[i] === "{") ext = extractBracedFieldValue(body, i);
      else if (body[i] === '"') ext = extractQuotedFieldValue(body, i);
      else if (/\d/.test(body[i])) ext = extractNumberFieldValue(body, i);
      else break;

      fields[key] = ext.value.replace(/\s*\n\s*/g, " ").trim();
      i = ext.next;
      i = skipWhitespace(body, i);
    }
    return fields;
  }

  function legacyParseBib(content) {
    const entries = [];
    const re = /@(\w+)\s*\{([^,]*),([^@]*)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const entryType = m[1].toLowerCase();
      if (entryType === "string" || entryType === "preamble" || entryType === "comment")
        continue;
      const id = m[2].trim();
      let body = m[3];
      body = body.replace(/\}\s*$/, "").trim();
      const entry = { ENTRYTYPE: entryType, ID: id };
      Object.assign(entry, parseEntryFields(body));
      entries.push(entry);
    }
    return entries;
  }

  function parseBib(content) {
    const doc = parseBibDocument(content || "");
    if (doc.entries.length && doc.ok) return doc.entries;
    const fallback = legacyParseBib(content || "");
    return fallback.length ? fallback : doc.entries;
  }

  function entriesToBib(entries) {
    const lines = [];
    for (const entry of entries) {
      const type = entry.ENTRYTYPE || "misc";
      const id = entry.ID || "unknown";
      lines.push(`@${type}{${id},`);

      const emitted = new Set();
      const orderedFields = Array.isArray(entry._fieldsAst)
        ? entry._fieldsAst.map(f => f && f.name).filter(Boolean)
        : [];
      const fields = [
        ...orderedFields,
        ...Object.keys(entry).filter(k => k !== "ENTRYTYPE" && k !== "ID" && !k.startsWith("_")),
      ];

      for (const k of fields) {
        if (!k || emitted.has(k) || k === "ENTRYTYPE" || k === "ID" || k.startsWith("_")) continue;
        if (!Object.prototype.hasOwnProperty.call(entry, k)) continue;
        const v = entry[k];
        if (v === undefined || v === null) continue;
        emitted.add(k);
        lines.push(`  ${k} = {${v}},`);
      }
      lines.push("}\n");
    }
    return lines.join("\n");
  }

  // ─── Fuzzy matching ──────────────────────────────────────────────────
  function tokenSortRatio(a, b) {
    if (typeof fuzzball !== "undefined") return fuzzball.token_sort_ratio(a, b);
    a = a.toLowerCase(); b = b.toLowerCase();
    if (a === b) return 100;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 100;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++)
      if (longer.includes(shorter[i])) matches++;
    return Math.round((matches / longer.length) * 100);
  }

  function titleSimilarity(a, b) {
    return tokenSortRatio(a.toLowerCase().trim(), b.toLowerCase().trim());
  }

  // ─── Normalization helpers ───────────────────────────────────────────
  function normalizeText(text) {
    if (!text) return "";
    return stripLatex(String(text)).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().replace(/\s+/g, " ");
  }

  function normalizeAuthorSet(authorStr) {
    if (!authorStr) return new Set();
    const norm = normalizeText(authorStr);
    const parts = norm.split(/\s+and\s+/);
    const names = new Set();
    for (let a of parts) {
      a = a.trim();
      if (!a) continue;
      if (a.includes(",")) names.add(a.split(",")[0].trim());
      else { const t = a.split(/\s+/); names.add(t[t.length - 1]); }
    }
    return names;
  }

  function normalizePages(p) { return p.trim().replace(/\s*-+\s*/g, "-"); }

  // ─── Field comparison ────────────────────────────────────────────────
  function compareAuthors(a, b) {
    const sa = normalizeAuthorSet(a), sb = normalizeAuthorSet(b);
    if (!sa.size && !sb.size) return 100;
    if (!sa.size || !sb.size) return 0;
    let inter = 0;
    for (const n of sa) if (sb.has(n)) inter++;
    return (inter / Math.max(sa.size, sb.size)) * 100;
  }

  function compareField(field, a, b) {
    const fieldName = normalizeFieldName(field);
    const na = normalizeText(a), nb = normalizeText(b);
    if (!na && !nb) return 100;
    if (!na || !nb) return 0;
    if (fieldName === "year" || fieldName === "doi") return na === nb ? 100 : 0;
    if (fieldName === "author") return compareAuthors(a, b);
    if (fieldName === "pages") return normalizePages(na) === normalizePages(nb) ? 100 : tokenSortRatio(na, nb);
    return tokenSortRatio(na, nb);
  }

  function fieldValuesEquivalent(field, a, b) {
    const fieldName = normalizeFieldName(field);
    const va = String(a || "");
    const vb = String(b || "");
    if (!va.trim() && !vb.trim()) return true;
    if (!va.trim() || !vb.trim()) return false;
    if (fieldName === "title") return normalizeTitle(va) === normalizeTitle(vb);
    if (!isFormatInsensitiveField(fieldName)) return va.trim() === vb.trim();
    if (fieldName === "author") return compareAuthors(va, vb) === 100;
    if (fieldName === "pages") return normalizePages(normalizeText(va)) === normalizePages(normalizeText(vb));
    return normalizeText(va) === normalizeText(vb);
  }

  function preferredVenueField(entry) {
    const type = (entry.ENTRYTYPE || entry.entry_type || "").toLowerCase();
    if (type === "article") return "journal";
    if (type === "inproceedings" || type === "conference" || type === "proceedings") return "booktitle";
    if (entry.booktitle && !entry.journal) return "booktitle";
    if (entry.journal && !entry.booktitle) return "journal";
    const version = classifyVersion(entry);
    if (version === "conference") return "booktitle";
    if (version === "journal" || version === "preprint") return "journal";
    return entry.booktitle ? "booktitle" : "journal";
  }

  function adaptCandidateToEntryFields(original, found) {
    const adapted = { ...found };
    const preferred = preferredVenueField(original);
    const alternate = preferred === "booktitle" ? "journal" : "booktitle";
    const foundVenue = adapted[preferred] || adapted[alternate] || "";

    if (foundVenue) {
      adapted[preferred] = foundVenue;
      if (!original[alternate]) delete adapted[alternate];
    }
    if (isNonPreprintVersion(original) && isArxivDoi(adapted.doi)) delete adapted.doi;
    return adapted;
  }

  function isArxivDoi(doi) {
    return /^10\.48550\/arxiv\./i.test(String(doi || "").trim());
  }

  function normalizeDoi(doi) {
    return String(doi || "")
      .trim()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
      .replace(/^doi\s*:\s*/i, "")
      .replace(/[}\]\)\s.,;]+$/g, "")
      .toLowerCase();
  }

  function extractDoiFromText(text) {
    const m = /10\.\d{4,9}\/[^\s{}"<>]+/i.exec(String(text || ""));
    return m ? normalizeDoi(m[0]) : "";
  }

  function doiFromEntry(entry = {}) {
    if (entry.doi) return normalizeDoi(entry.doi);
    return extractDoiFromText([
      entry.url,
      entry.howpublished,
      entry.note,
    ].filter(Boolean).join(" "));
  }

  function extractUrlFromText(text) {
    const value = String(text || "");
    const latexUrl = /\\url\{([^}]+)\}/i.exec(value);
    if (latexUrl) return latexUrl[1].trim();
    const m = /https?:\/\/[^\s{}"<>\\]+/i.exec(value);
    return m ? m[0].replace(/[}\]\)\s.,;]+$/g, "") : "";
  }

  function urlFromEntry(entry = {}) {
    return extractUrlFromText([
      entry.url,
      entry.howpublished,
      entry.note,
    ].filter(Boolean).join(" "));
  }

  function isLikelyNonPublicationEntry(entry = {}) {
    const type = String(entry.ENTRYTYPE || entry.entry_type || "").toLowerCase();
    const url = urlFromEntry(entry);
    if (!url) return false;
    if (arxivIdFromEntry(entry) || hasZenodoSignal(entry)) return false;
    const publicationTypes = new Set(["article", "inproceedings", "conference", "proceedings", "incollection", "book", "inbook", "phdthesis", "mastersthesis"]);
    if (publicationTypes.has(type)) return false;
    const nonPublicationTypes = new Set(["software", "online", "www", "webpage", "electronic", "manual"]);
    if (nonPublicationTypes.has(type)) return true;
    if (type === "misc" || type === "unpublished")
      return !entry.journal && !entry.booktitle && !doiFromEntry(entry);
    return false;
  }

  function normalizeArxivId(id) {
    return String(id || "")
      .trim()
      .replace(/^arxiv:/i, "")
      .replace(/^https?:\/\/(?:export\.)?arxiv\.org\/abs\//i, "")
      .replace(/^10\.48550\/arxiv\./i, "")
      .replace(/v\d+$/i, "");
  }

  function extractArxivIdFromText(text) {
    const value = String(text || "");
    const urlId = /(?:export\.)?arxiv\.org\/abs\/([^?#\s}]+)/i.exec(value);
    if (urlId) return normalizeArxivId(urlId[1]);

    const doiId = /10\.48550\/arxiv\.([A-Za-z-]+(?:\.[A-Z]{2})?\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?/i.exec(value);
    if (doiId) return normalizeArxivId(doiId[1]);

    const inlineId = /arxiv\s*:\s*([A-Za-z-]+(?:\.[A-Z]{2})?\/\d{7}|\d{4}\.\d{4,5})(?:v\d+)?/i.exec(value);
    return inlineId ? normalizeArxivId(inlineId[1]) : "";
  }

  function arxivIdFromEntry(entry = {}) {
    const archivePrefix = String(entry.archiveprefix || entry.eprinttype || "").toLowerCase();
    if (entry.eprint && (!archivePrefix || archivePrefix.includes("arxiv") || archivePrefix.includes("corr")))
      return normalizeArxivId(entry.eprint);
    return extractArxivIdFromText([
      entry.doi,
      entry.url,
      entry.howpublished,
      entry.journal,
      entry.booktitle,
      entry.note,
      entry.volume,
    ].filter(Boolean).join(" "));
  }

  function isArxivCandidate(entry = {}) {
    if (!entry) return false;
    if (String(entry._source || "").toLowerCase().includes("arxiv")) return true;
    if (isArxivDoi(entry.doi)) return true;
    if (arxivIdFromEntry(entry)) return true;
    const sourceText = [
      entry.url,
      entry.archiveprefix,
      entry.eprinttype,
    ].filter(Boolean).join(" ").toLowerCase();
    return /arxiv/.test(sourceText);
  }

  function isNonPreprintVersion(entry) {
    const version = classifyVersion(entry);
    return version === "journal" || version === "conference";
  }

  function publicFieldNames(entry) {
    return Object.keys(entry || {}).filter(k => k !== "ENTRYTYPE" && k !== "ID" && !k.startsWith("_"));
  }

  function makeIgnoredFieldSet(options = {}) {
    return new Set((options.ignoredFields || []).map(normalizeFieldName).filter(Boolean));
  }

  function comparisonFieldNames(original, found, options = {}) {
    const ignored = makeIgnoredFieldSet(options);
    const names = [];
    const add = field => {
      field = normalizeFieldName(field);
      if (!field || ignored.has(field) || names.includes(field)) return;
      names.push(field);
    };
    add("title");
    publicFieldNames(original).forEach(add);
    COMPARED_FIELDS.forEach(add);
    publicFieldNames(found).forEach(field => {
      if (!original[field]) add(field);
    });
    return names;
  }

  function compareEntry(original, found, options = {}) {
    found = adaptCandidateToEntryFields(original, found || {});
    const origTitle = original.title || "";
    const foundTitle = found.title || "";
    const titleScore = tokenSortRatio(normalizeTitle(origTitle), normalizeTitle(foundTitle));
    const ignoredFields = makeIgnoredFieldSet(options);

    if (!ignoredFields.has("title") && titleScore < TITLE_MATCH_THRESHOLD) {
      return { status: "needs_review", title_score: titleScore, field_diffs: [], suggested: found };
    }

    const fieldDiffs = [], enrichments = [];
    let hasDifference = false;

    for (const field of comparisonFieldNames(original, found, options)) {
      const origVal = original[field] || "";
      const foundVal = found[field] || "";
      if (!origVal && !foundVal) continue;

      if (!origVal.trim() && foundVal.trim()) {
        enrichments.push({ field, original: origVal, found: foundVal, score: 0 });
        continue;
      }
      if (origVal.trim() && !foundVal.trim()) {
        hasDifference = true;
        fieldDiffs.push({ field, original: origVal, found: foundVal, score: 0 });
        continue;
      }

      const score = compareField(field, origVal, foundVal);
      if (score < 100) {
        hasDifference = true;
        fieldDiffs.push({ field, original: origVal, found: foundVal, score: Math.round(score * 10) / 10 });
      }
    }

    const allDiffs = fieldDiffs.concat(enrichments);
    const status = hasDifference ? "updated" : "verified";
    const suggested = {};
    if (hasDifference || enrichments.length)
      for (const d of allDiffs) if (d.found) suggested[d.field] = d.found;

    return { status, title_score: Math.round(titleScore * 10) / 10, field_diffs: allDiffs, suggested };
  }

  /**
   * When compareEntry returns needs_review (title below threshold), field_diffs is empty.
   * Build a full diff against the closest `found` record so the UI can show suggestions
   * and per-field accept / revert actions.
   */
  function fieldDiffsForNeedsReview(original, found, options = {}) {
    if (!found) return [];
    const merged = adaptCandidateToEntryFields(original, found);
    const ignoredFields = makeIgnoredFieldSet(options);

    const origTitle = original.title || "";
    const foundTitle = merged.title || "";
    const titleScore = tokenSortRatio(normalizeTitle(origTitle), normalizeTitle(foundTitle));
    const fieldDiffs = [];
    const enrichments = [];

    if (!ignoredFields.has("title") && (origTitle.trim() || foundTitle.trim())) {
      fieldDiffs.push({
        field: "title",
        original: origTitle,
        found: foundTitle,
        score: Math.round(titleScore * 10) / 10,
      });
    }

    for (const field of comparisonFieldNames(original, merged, options)) {
      const origVal = original[field] || "";
      const foundVal = merged[field] || "";
      if (!origVal && !foundVal) continue;

      if (!origVal.trim() && foundVal.trim()) {
        enrichments.push({ field, original: origVal, found: foundVal, score: 0 });
        continue;
      }
      if (origVal.trim() && !foundVal.trim()) {
        fieldDiffs.push({ field, original: origVal, found: foundVal, score: 0 });
        continue;
      }

      const score = compareField(field, origVal, foundVal);
      if (score < 100) {
        fieldDiffs.push({
          field,
          original: origVal,
          found: foundVal,
          score: Math.round(score * 10) / 10,
        });
      }
    }

    return fieldDiffs.concat(enrichments);
  }

  // ─── API response converters ─────────────────────────────────────────
  function crossrefToStandard(item) {
    const authors = (item.author || []).map(a => {
      const f = a.family || "", g = a.given || "";
      return f ? `${f}, ${g}`.replace(/, $/, "") : "";
    }).filter(Boolean);

    const dp = item["published-print"] || item["published-online"] || item.published || item.issued || {};
    const year = dp["date-parts"]?.[0]?.[0]?.toString() || "";
    const container = item["container-title"] || [];
    const type = String(item.type || "").toLowerCase();
    const venue = container[0] || item.event?.name || item["group-title"] || "";
    const isJournal = type === "journal-article" || type === "journal" || type === "journal-issue" || type === "journal-volume";
    const isProceedings = type === "proceedings-article" || type === "proceedings" || type === "proceedings-series";
    const isBookLike = type.startsWith("book-") || type === "book" || type === "monograph" || type === "edited-book" || type === "reference-book";

    const doi = item.DOI || "";
    const title = (item.title || [""])[0] || "";
    const sourceUrl = title
      ? `https://search.crossref.org/search/works?q=${encodeURIComponent(title)}&from_ui=yes`
      : (item.URL || "");
    return {
      title,
      author: authors.join(" and "),
      year,
      journal: isJournal ? venue : "",
      booktitle: isProceedings || isBookLike ? venue : "",
      volume: item.volume || "",
      number: item.issue || "",
      pages: item.page || "",
      doi,
      publisher: item.publisher || "",
      url: item.URL || "",
      _source: "crossref",
      _source_url: sourceUrl,
      _crossref_type: type,
    };
  }

  function zenodoToStandard(record) {
    const metadata = record?.metadata || {};
    const creators = metadata.creators || [];
    const authors = creators.map(c => {
      const po = c.person_or_org || {};
      const family = po.family_name || c.family_name || "";
      const given = po.given_name || c.given_name || "";
      const name = c.name || po.name || "";
      if (family) return `${family}, ${given}`.replace(/, $/, "");
      return String(name || "").trim();
    }).filter(Boolean);

    const publicationDate = String(metadata.publication_date || record.created || "");
    const resourceType = metadata.resource_type || {};
    const journal = metadata.journal || {};
    const meeting = metadata.meeting || {};
    const venue = journal.title || "";
    const meetingTitle = meeting.title || meeting.acronym || "";
    const doi = record.doi || metadata.doi || "";

    const sourceUrl = record.links?.self_html || record.links?.self_doi_html || record.doi_url || (doi ? `https://doi.org/${doi}` : "");
    return {
      title: metadata.title || record.title || "",
      author: authors.join(" and "),
      year: publicationDate.slice(0, 4),
      journal: venue,
      booktitle: venue ? "" : meetingTitle,
      volume: journal.volume || "",
      number: journal.issue || "",
      pages: journal.pages || metadata.imprint?.pages || "",
      doi,
      publisher: metadata.publisher || "Zenodo",
      url: sourceUrl,
      howpublished: resourceType.title || resourceType.type || "",
      _source: "zenodo",
      _source_url: sourceUrl,
      _zenodo_type: resourceType.type || "",
    };
  }

  function extractZenodoDoiFromText(text) {
    const m = /10\.5281\/zenodo\.\d+(?:\.\d+)?/i.exec(String(text || ""));
    return m ? m[0].toLowerCase() : "";
  }

  function zenodoDoiFromEntry(entry = {}) {
    return extractZenodoDoiFromText([
      entry.doi,
      entry.url,
      entry.howpublished,
      entry.note,
    ].filter(Boolean).join(" "));
  }

  function hasZenodoSignal(entry = {}) {
    if (!entry) return false;
    if (zenodoDoiFromEntry(entry)) return true;
    const text = [
      entry.publisher,
      entry.url,
      entry.howpublished,
      entry.note,
      entry.journal,
      entry.booktitle,
      entry.organization,
      entry.institution,
    ].filter(Boolean).join(" ").toLowerCase();
    return /\bzenodo\b|zenodo\.org/.test(text);
  }

  function ssToStandard(paper) {
    const authors = (paper.authors || []).map(a => {
      const name = a.name || "";
      const parts = name.split(/\s+/);
      if (parts.length >= 2) return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
      return name;
    }).filter(Boolean);

    const ext = paper.externalIds || {};
    const pv = paper.publicationVenue;
    const venue = (pv && typeof pv === "object" ? pv.name : null) || paper.venue || "";

    const sourceUrl = paper.url || (paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : "");
    return {
      title: paper.title || "",
      author: authors.join(" and "),
      year: (paper.year || "").toString(),
      journal: venue,
      volume: "", number: "", pages: "",
      doi: ext.DOI || "",
      publisher: "",
      url: ext.DOI ? `https://doi.org/${ext.DOI}` : "",
      _source: "semantic_scholar",
      _source_url: sourceUrl || (ext.DOI ? `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(ext.DOI)}` : ""),
    };
  }

  // ─── Paper matching helpers ──────────────────────────────────────────
  function extractLastNames(authorStr) {
    if (!authorStr) return new Set();
    const names = new Set();
    for (let part of authorStr.split(/\s+and\s+/i)) {
      part = part.trim();
      if (!part) continue;
      if (part.includes(",")) names.add(part.split(",")[0].trim().toLowerCase());
      else { const t = part.split(/\s+/); names.add(t[t.length - 1].toLowerCase()); }
    }
    return names;
  }

  function isSamePaper(a, b) {
    if (titleSimilarity(a.title || "", b.title || "") < 85) return false;
    if (a.year && b.year && a.year !== b.year) return false;
    const aa = extractLastNames(a.author), ba = extractLastNames(b.author);
    if (aa.size && ba.size) {
      let inter = 0; for (const n of aa) if (ba.has(n)) inter++;
      if (inter / Math.max(aa.size, ba.size) < 0.3) return false;
    }
    return true;
  }

  function arxivToStandard(paper) {
    const authors = (paper.authors || []).map(name => {
      const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
      return String(name || "").trim();
    }).filter(Boolean);

    const arxivId = String(paper.id || "").replace(/^https?:\/\/arxiv\.org\/abs\//i, "").replace(/v\d+$/i, "");
    const year = paper.published ? String(paper.published).slice(0, 4) : "";
    const journal = paper.journalRef || (arxivId ? `arXiv preprint arXiv:${arxivId}` : "arXiv preprint");

    const sourceUrl = arxivId ? `https://arxiv.org/abs/${arxivId}` : (paper.id || "");
    return {
      title: paper.title || "",
      author: authors.join(" and "),
      year,
      journal,
      volume: "",
      number: "",
      pages: "",
      doi: paper.doi || (arxivId ? `10.48550/arXiv.${arxivId}` : ""),
      publisher: "",
      url: sourceUrl,
      _source: "arxiv",
      _source_url: sourceUrl,
    };
  }

  function openreviewToStandard(note) {
    const content = note?.content || {};
    const noteId = String(note?.forum || note?.id || "").trim();
    const val = key => {
      const item = content[key];
      if (item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "value")) return item.value;
      return item || "";
    };
    const title = String(val("title") || "").trim();
    const venue = String(val("venue") || "").trim();
    const bibtex = String(val("_bibtex") || "").trim();

    const authorList = val("authors");
    let authors = Array.isArray(authorList)
      ? authorList.map(a => String(a || "").trim()).filter(Boolean).join(" and ")
      : String(authorList || "").trim();
    let year = "";
    let booktitle = "";
    let journal = "";
    let doi = "";
    let url = String(val("html") || val("pdf") || "").trim();

    if (bibtex) {
      const authorMatch = /author\s*=\s*\{([^}]+)\}/i.exec(bibtex);
      if (authorMatch) authors = authorMatch[1].replace(/\s+and\s+/gi, " and ");
      const yearMatch = /year\s*=\s*\{(\d{4})\}/i.exec(bibtex);
      if (yearMatch) year = yearMatch[1];
      const booktitleMatch = /booktitle\s*=\s*\{([^}]+)\}/i.exec(bibtex);
      if (booktitleMatch) booktitle = booktitleMatch[1];
      const journalMatch = /journal\s*=\s*\{([^}]+)\}/i.exec(bibtex);
      if (journalMatch) journal = journalMatch[1];
      const doiMatch = /doi\s*=\s*\{([^}]+)\}/i.exec(bibtex);
      if (doiMatch) doi = doiMatch[1];
      const urlMatch = /url\s*=\s*\{([^}]+)\}/i.exec(bibtex);
      if (urlMatch) url = urlMatch[1];
    }

    if (!url && noteId) url = `https://openreview.net/forum?id=${noteId}`;
    if (!year && venue) {
      const yearFromVenue = /\b(20\d{2})\b/.exec(venue);
      if (yearFromVenue) year = yearFromVenue[1];
    }

    const rejectedOrSubmitted = /\b(submitted|under review|withdrawn|rejected|desk rejected)\b/i.test(venue);
    const acceptedOrPublished = !rejectedOrSubmitted && (
      !!booktitle || !!journal || /\b(accepted|published|proceedings|conference|poster|oral|spotlight|journal|transactions|tmlr)\b/i.test(venue)
    );
    if (!acceptedOrPublished && venue && !booktitle && !journal) journal = "OpenReview preprint";

    const isJournal = !booktitle && journal && journal !== "OpenReview preprint";
    return {
      title,
      author: authors,
      year,
      journal: isJournal ? (journal || venue) : "",
      booktitle: acceptedOrPublished ? (booktitle || (!isJournal ? venue : "")) : "",
      volume: "",
      number: "",
      pages: "",
      doi,
      publisher: "",
      url: doi ? `https://doi.org/${doi}` : url,
      _source: "openreview",
      _source_url: noteId ? `https://openreview.net/forum?id=${encodeURIComponent(noteId)}` : url,
      _openreview_status: acceptedOrPublished ? "published" : "preprint",
    };
  }

  function dblpToStandard(info) {
    function dblpValue(value) {
      if (Array.isArray(value)) {
        const first = value.map(dblpValue).find(Boolean);
        return first || "";
      }
      if (value && typeof value === "object") {
        return String(value.text || value["@href"] || value["@id"] || value.href || value.url || "").trim();
      }
      return String(value || "").trim();
    }

    function cleanDblpAuthorName(name) {
      return String(name || "").trim().replace(/\s+\d{4}$/, "").trim();
    }

    const authorArr = info?.authors?.author || [];
    const authors = (Array.isArray(authorArr) ? authorArr : [authorArr])
      .map(a => {
        const name = cleanDblpAuthorName(dblpValue(a));
        if (name.includes(",")) return name;
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
        return name;
      }).filter(Boolean);

    const title = dblpValue(info?.title).replace(/\.\s*$/, "").trim();
    const venue = dblpValue(info?.venue);
    const year = dblpValue(info?.year);
    const type = dblpValue(info?.type).toLowerCase();
    const pages = dblpValue(info?.pages);
    const volume = dblpValue(info?.volume);
    const doi = dblpValue(info?.doi);
    const ee = dblpValue(info?.ee);
    const url = dblpValue(info?.url);

    const isJournal = type.includes("journal") || type.includes("article");
    const isConference = type.includes("conference") || type.includes("workshop") || type.includes("proceedings");

    const sourceUrl = url || ee || "";
    const result = {
      title,
      author: authors.join(" and "),
      year,
      journal: isJournal || (!isConference && venue) ? venue : "",
      booktitle: isConference ? venue : "",
      volume,
      number: "",
      pages,
      doi,
      publisher: "",
      url: doi ? `https://doi.org/${doi}` : (ee || url),
      _source: "dblp",
      _source_url: sourceUrl,
    };

    return result;
  }

  function arxivAbsPageToStandard(text, arxivId = "") {
    const content = String(text || "");
    const normalizedId = normalizeArxivId(arxivId) || extractArxivIdFromText(content);
    const titleMatch = /(?:^|\n)#\s*Title:\s*([^\n]+)/i.exec(content)
      || /(?:^|\n)#\s*\[[^\]]+\]\s*([^\n]+)/i.exec(content)
      || /(?:^|\n)Title:\s*([^\n]+)/i.exec(content);
    const authorsMatch = /(?:^|\n)Authors:\s*([^\n]+)/i.exec(content);
    const submittedMatch = /Submitted on\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i.exec(content);

    const markdownLinkNames = (authorsMatch?.[1] || "").match(/\[([^\]]+)\]\([^)]*\)/g) || [];
    const authors = markdownLinkNames.map(link => {
      const m = /^\[([^\]]+)\]/.exec(link);
      return m ? m[1].trim() : "";
    }).filter(Boolean);

    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
    const year = submittedMatch ? submittedMatch[1].slice(-4) : "";

    const sourceUrl = normalizedId ? `https://arxiv.org/abs/${normalizedId}` : "";
    return {
      title,
      author: authors.map(name => {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
        return String(name || "").trim();
      }).filter(Boolean).join(" and "),
      year,
      journal: normalizedId ? `arXiv preprint arXiv:${normalizedId}` : "arXiv preprint",
      volume: "",
      number: "",
      pages: "",
      doi: normalizedId ? `10.48550/arXiv.${normalizedId}` : "",
      publisher: "",
      url: sourceUrl,
      _source: "arxiv",
      _source_url: sourceUrl,
    };
  }

  function splitBibAuthors(authorStr) {
    if (!authorStr) return [];
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < authorStr.length; i++) {
      const c = authorStr[i];
      if (c === "{") depth++;
      else if (c === "}") depth = Math.max(0, depth - 1);
      if (depth === 0 && /\s/.test(c)) {
        const slice = authorStr.slice(i);
        const m = /^\s+and\s+/i.exec(slice);
        if (m) {
          parts.push(authorStr.slice(start, i).trim());
          i += m[0].length - 1;
          start = i + 1;
        }
      }
    }
    const last = authorStr.slice(start).trim();
    if (last) parts.push(last);
    return parts.filter(Boolean);
  }

  function normalizePersonName(name) {
    const stripped = normalizeText(stripLatex(name || "").replace(/[{}]/g, " ").replace(/[.]/g, " "));
    if (!stripped) return { raw: "", family: "", given: "", compact: "" };
    if (stripped.includes(",")) {
      const [family, ...rest] = stripped.split(",");
      return {
        raw: stripped,
        family: family.trim(),
        given: rest.join(" ").trim(),
        compact: stripped.replace(/[^a-z0-9\p{L}\p{N}]+/gu, ""),
      };
    }
    const tokens = stripped.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      return { raw: stripped, family: tokens[0], given: "", compact: tokens[0].replace(/[^a-z0-9\p{L}\p{N}]+/gu, "") };
    }
    const particles = new Set(["da", "de", "del", "der", "di", "du", "la", "le", "van", "von"]);
    let familyStart = tokens.length - 1;
    while (familyStart > 0 && particles.has(tokens[familyStart - 1])) familyStart--;
    const family = tokens.slice(familyStart).join(" ");
    return {
      raw: stripped,
      family,
      given: tokens.slice(0, familyStart).join(" "),
      compact: stripped.replace(/[^a-z0-9\p{L}\p{N}]+/gu, ""),
    };
  }

  function namesCompatible(a, b) {
    if (!a.family || !b.family) return false;
    if (a.family === b.family) return true;
    if (a.compact && b.compact && (a.compact === b.compact)) return true;
    if (a.family.length === 1 || b.family.length === 1) return a.family[0] === b.family[0];
    return tokenSortRatio(a.family, b.family) >= 88;
  }

  function compareAuthorsDetailed(a, b) {
    const left = splitBibAuthors(a).map(normalizePersonName);
    const right = splitBibAuthors(b).map(normalizePersonName);
    if (!left.length && !right.length)
      return { score: 100, overlap: 1, firstAuthorMatch: true, countMatch: true, orderMatch: true, leftCount: 0, rightCount: 0 };
    if (!left.length || !right.length)
      return { score: 0, overlap: 0, firstAuthorMatch: false, countMatch: false, orderMatch: false, leftCount: left.length, rightCount: right.length };

    let matches = 0;
    const used = new Set();
    for (const l of left) {
      const idx = right.findIndex((r, i) => !used.has(i) && namesCompatible(l, r));
      if (idx >= 0) { matches++; used.add(idx); }
    }
    const overlap = matches / Math.max(left.length, right.length);
    const firstAuthorMatch = namesCompatible(left[0], right[0]);
    const countMatch = left.length === right.length;
    const orderMatch = left.every((l, i) => right[i] && namesCompatible(l, right[i]));
    const score = Math.round((overlap * 70 + (firstAuthorMatch ? 20 : 0) + (countMatch ? 5 : 0) + (orderMatch ? 5 : 0)) * 10) / 10;
    return { score, overlap: Math.round(overlap * 1000) / 1000, firstAuthorMatch, countMatch, orderMatch, leftCount: left.length, rightCount: right.length };
  }

  function mergeMetadata(primary, secondary) {
    const merged = { ...primary };
    for (const [k, v] of Object.entries(secondary)) {
      if (k.startsWith("_")) continue;
      if (!merged[k] && v) merged[k] = v;
    }
    merged._source = `${primary._source || ""}+${secondary._source || ""}`;
    return merged;
  }

  function bestMatch(candidates, queryTitle) {
    let best = null, bestScore = 0;
    for (const c of candidates) {
      const s = titleSimilarity(queryTitle, c.title || "");
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best && bestScore >= MIN_TITLE_SIM ? best : null;
  }

  function mergeConfig(config = {}) {
    return {
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...(config.thresholds || {}) },
    };
  }

  function venueKey(name) {
    return normalizeText(stripLatex(name || "")).replace(/[^a-z0-9\p{L}\p{N}\s&]+/gu, "").replace(/\s+/g, " ").trim();
  }

  function normalizeVenueName(name) {
    return venueKey(name);
  }

  function classifyVersion(entry) {
    const type = (entry.ENTRYTYPE || entry.entry_type || "").toLowerCase();
    if (String(entry._source || "").toLowerCase().includes("openreview") && entry._openreview_status === "preprint") return "preprint";
    const crossrefType = String(entry._crossref_type || "").toLowerCase();
    if (crossrefType === "posted-content") return "preprint";
    if (crossrefType === "journal-article" || crossrefType === "journal") return "journal";
    if (crossrefType === "proceedings-article" || crossrefType === "proceedings" || crossrefType === "proceedings-series") return "conference";
    const venue = `${entry.journal || ""} ${entry.booktitle || ""} ${entry.series || ""} ${entry.eprint || ""} ${entry.archiveprefix || ""}`.toLowerCase();
    if (type === "article" || entry.journal) {
      if (/arxiv|corr|preprint/.test(venue)) return "preprint";
      return "journal";
    }
    if (type === "inproceedings" || type === "conference" || entry.booktitle) return "conference";
    if (/arxiv|corr|preprint/.test(venue) || entry.eprint || entry.archiveprefix) return "preprint";
    return "unknown";
  }

  function verifyEntryLayered(entry, candidates, config = {}) {
    const list = Array.isArray(candidates) ? candidates.filter(Boolean) : (candidates ? [candidates] : []);
    const cfg = mergeConfig(config);
    const sourceVersion = classifyVersion(entry);
    const evidence = list.map(candidate => {
      const adaptedCandidate = adaptCandidateToEntryFields(entry, candidate);
      const titleScore = titleSimilarity(normalizeTitle(entry.title || ""), normalizeTitle(candidate.title || ""));
      const authorEvidence = compareAuthorsDetailed(entry.author || "", adaptedCandidate.author || "");
      const yearMatch = !entry.year || !adaptedCandidate.year || String(entry.year) === String(adaptedCandidate.year);
      const entryVenue = normalizeVenueName(entry.journal || entry.booktitle || "");
      const candidateVenue = normalizeVenueName(adaptedCandidate.journal || adaptedCandidate.booktitle || "");
      const venueMatch = !entryVenue || !candidateVenue || entryVenue === candidateVenue;
      const score = Math.round((titleScore * 0.55 + authorEvidence.score * 0.3 + (yearMatch ? 10 : 0) + (venueMatch ? 5 : 0)) * 10) / 10;
      return { candidate: adaptedCandidate, rawCandidate: candidate, titleScore, author: authorEvidence, yearMatch, venueMatch, entryVenue, candidateVenue, preferredVenueField: preferredVenueField(entry), score };
    });

    const hasPublishedCandidate = evidence.some(item => item.titleScore >= cfg.thresholds.titleCandidate && isNonPreprintVersion(item.candidate));
    const shouldPreferArxivAuthority = sourceVersion === "preprint"
      && !hasPublishedCandidate
      && evidence.some(item => item.titleScore >= cfg.thresholds.titleCandidate && isArxivCandidate(item.rawCandidate));

    evidence.sort((a, b) => {
      if (sourceVersion === "preprint" && hasPublishedCandidate) {
        const aPublished = a.titleScore >= cfg.thresholds.titleCandidate && isNonPreprintVersion(a.candidate);
        const bPublished = b.titleScore >= cfg.thresholds.titleCandidate && isNonPreprintVersion(b.candidate);
        if (aPublished !== bPublished) return aPublished ? -1 : 1;
      }
      if (shouldPreferArxivAuthority) {
        const aArxiv = isArxivCandidate(a.rawCandidate);
        const bArxiv = isArxivCandidate(b.rawCandidate);
        if (aArxiv !== bArxiv) return aArxiv ? -1 : 1;
      }
      return b.score - a.score;
    });

    const preferredCandidateIndex = Number.isInteger(config.preferredCandidateIndex) ? config.preferredCandidateIndex : -1;
    if (preferredCandidateIndex > 0 && preferredCandidateIndex < evidence.length) {
      const [preferred] = evidence.splice(preferredCandidateIndex, 1);
      evidence.unshift(preferred);
    }

    const best = evidence[0] || null;
    const existence = best && best.titleScore >= cfg.thresholds.titleCandidate ? "found" : "not_found";
    let identity = "insufficient";
    if (best) {
      if (best.titleScore >= cfg.thresholds.titleStrong && best.author.score >= cfg.thresholds.authorStrong && best.yearMatch)
        identity = "same_work";
      else if (best.titleScore >= cfg.thresholds.titleCandidate && (best.author.score >= 40 || !entry.author || !best.candidate.author))
        identity = "likely_same";
      else
        identity = "mismatch";
    }

    const foundVersion = best ? classifyVersion({ ...best.candidate, ENTRYTYPE: best.candidate.ENTRYTYPE || "" }) : "unknown";
    let version = "unknown";
    if (existence === "found") {
      if (sourceVersion === "unknown" || foundVersion === "unknown") version = "unknown";
      else if (sourceVersion === foundVersion) version = "matching_version";
      else version = "related_version";
    }

    let freshness = "not_checked";
    if (best && sourceVersion === "preprint" && foundVersion !== "preprint" && foundVersion !== "unknown")
      freshness = "newer_metadata_available";
    else if (best && existence === "found")
      freshness = "current";

    const cmp = best ? compareEntry(entry, best.candidate) : { status: "not_found", title_score: 0, field_diffs: [], suggested: {} };
    let status = "not_found";
    if (existence === "not_found") status = "not_found";
    else if (identity === "mismatch" || identity === "insufficient" || version === "related_version") status = "needs_review";
    else status = cmp.status === "updated" ? "updated" : "verified";

    return {
      status,
      layers: { existence, identity, version, freshness },
      evidence,
      best: best ? best.candidate : null,
      field_diffs: cmp.field_diffs || [],
      suggested: cmp.suggested || {},
      title_score: best ? best.titleScore : 0,
    };
  }

  // ─── Public API ──────────────────────────────────────────────────────
  exports.TITLE_MATCH_THRESHOLD = TITLE_MATCH_THRESHOLD;
  exports.MIN_TITLE_SIM = MIN_TITLE_SIM;
  exports.COMPARED_FIELDS = COMPARED_FIELDS;
  exports.FORMAT_INSENSITIVE_FIELDS = FORMAT_INSENSITIVE_FIELDS;
  exports.DEFAULT_CONFIG = DEFAULT_CONFIG;

  exports.stripLatex = stripLatex;
  exports.normalizeTitle = normalizeTitle;
  exports.normalizeFieldName = normalizeFieldName;
  exports.isFormatInsensitiveField = isFormatInsensitiveField;
  exports.parseBibDocument = parseBibDocument;
  exports.resolveBibValue = resolveBibValue;
  exports.expandParsedFieldValue = expandParsedFieldValue;
  exports.parseBib = parseBib;
  exports.entriesToBib = entriesToBib;
  exports.tokenSortRatio = tokenSortRatio;
  exports.titleSimilarity = titleSimilarity;
  exports.normalizeText = normalizeText;
  exports.normalizeAuthorSet = normalizeAuthorSet;
  exports.splitBibAuthors = splitBibAuthors;
  exports.compareAuthorsDetailed = compareAuthorsDetailed;
  exports.normalizePages = normalizePages;
  exports.compareAuthors = compareAuthors;
  exports.compareField = compareField;
  exports.fieldValuesEquivalent = fieldValuesEquivalent;
  exports.preferredVenueField = preferredVenueField;
  exports.adaptCandidateToEntryFields = adaptCandidateToEntryFields;
  exports.isArxivDoi = isArxivDoi;
  exports.normalizeDoi = normalizeDoi;
  exports.extractDoiFromText = extractDoiFromText;
  exports.doiFromEntry = doiFromEntry;
  exports.extractUrlFromText = extractUrlFromText;
  exports.urlFromEntry = urlFromEntry;
  exports.isLikelyNonPublicationEntry = isLikelyNonPublicationEntry;
  exports.isArxivCandidate = isArxivCandidate;
  exports.normalizeArxivId = normalizeArxivId;
  exports.extractArxivIdFromText = extractArxivIdFromText;
  exports.arxivIdFromEntry = arxivIdFromEntry;
  exports.compareEntry = compareEntry;
  exports.fieldDiffsForNeedsReview = fieldDiffsForNeedsReview;
  exports.crossrefToStandard = crossrefToStandard;
  exports.zenodoToStandard = zenodoToStandard;
  exports.extractZenodoDoiFromText = extractZenodoDoiFromText;
  exports.zenodoDoiFromEntry = zenodoDoiFromEntry;
  exports.hasZenodoSignal = hasZenodoSignal;
  exports.ssToStandard = ssToStandard;
  exports.arxivToStandard = arxivToStandard;
  exports.openreviewToStandard = openreviewToStandard;
  exports.dblpToStandard = dblpToStandard;
  exports.arxivAbsPageToStandard = arxivAbsPageToStandard;
  exports.extractLastNames = extractLastNames;
  exports.isSamePaper = isSamePaper;
  exports.mergeMetadata = mergeMetadata;
  exports.bestMatch = bestMatch;
  exports.mergeConfig = mergeConfig;
  exports.normalizeVenueName = normalizeVenueName;
  exports.classifyVersion = classifyVersion;
  exports.verifyEntryLayered = verifyEntryLayered;

})(typeof module !== "undefined" && module.exports ? module.exports : (window.BibLib = {}));
