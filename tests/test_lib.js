const assert = require("assert");
const lib = require("../docs/lib.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── stripLatex ──");

test("removes LaTeX accents", () => {
  assert.strictEqual(lib.stripLatex("\\'a"), "á");
  assert.strictEqual(lib.stripLatex('\\"o'), "ö");
  assert.strictEqual(lib.stripLatex("\\~n"), "ñ");
});

test("removes LaTeX commands", () => {
  assert.strictEqual(lib.stripLatex("\\textbf{bold}"), "bold");
  assert.strictEqual(lib.stripLatex("\\emph{text}"), "text");
});

test("removes braces", () => {
  assert.strictEqual(lib.stripLatex("{Hello} {World}"), "Hello World");
});

test("returns empty for falsy input", () => {
  assert.strictEqual(lib.stripLatex(""), "");
  assert.strictEqual(lib.stripLatex(null), "");
  assert.strictEqual(lib.stripLatex(undefined), "");
});

test("handles combined LaTeX", () => {
  const input = "Ren\\'{e} {D}escartes";
  const result = lib.stripLatex(input);
  assert.ok(result.includes("Descartes"), `Expected Descartes in "${result}"`);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── normalizeTitle ──");

test("lowercases and strips LaTeX", () => {
  assert.strictEqual(lib.normalizeTitle("{Attention} Is All You Need"), "attention is all you need");
});

test("handles empty string", () => {
  assert.strictEqual(lib.normalizeTitle(""), "");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── parseBib ──");

test("parses a single article entry", () => {
  const bib = `@article{vaswani2017,
  title = {Attention Is All You Need},
  author = {Vaswani, Ashish},
  year = {2017},
}`;
  const entries = lib.parseBib(bib);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].ENTRYTYPE, "article");
  assert.strictEqual(entries[0].ID, "vaswani2017");
  assert.strictEqual(entries[0].title, "Attention Is All You Need");
  assert.strictEqual(entries[0].author, "Vaswani, Ashish");
  assert.strictEqual(entries[0].year, "2017");
});

test("parses multiple entries", () => {
  const bib = `@article{a, title={Paper A}, year={2020}}
@inproceedings{b, title={Paper B}, year={2021}}`;
  const entries = lib.parseBib(bib);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].ID, "a");
  assert.strictEqual(entries[1].ID, "b");
  assert.strictEqual(entries[1].ENTRYTYPE, "inproceedings");
});

test("skips @string and @comment entries", () => {
  const bib = `@string{foo = {bar}}

@comment{This is a comment, with commas}

@article{real, title={Real Entry}, year={2023}}`;
  const entries = lib.parseBib(bib);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].ID, "real");
});

test("handles double-quoted field values", () => {
  const bib = `@article{test, title="Quoted Title", year={2023}}`;
  const entries = lib.parseBib(bib);
  assert.strictEqual(entries[0].title, "Quoted Title");
});

test("handles numeric field values", () => {
  const bib = `@article{test, title={Test}, year=2023}`;
  const entries = lib.parseBib(bib);
  assert.strictEqual(entries[0].year, "2023");
});

test("returns empty array for invalid input", () => {
  assert.deepStrictEqual(lib.parseBib("not bibtex"), []);
  assert.deepStrictEqual(lib.parseBib(""), []);
});

test("parses misc with missing closing braces before next field (double-brace typos)", () => {
  const bib = `@misc{github_copilot_2025,
  author = {{GitHub},
  title = {{GitHub Copilot},
  howpublished = {\\url{https://github.com/features/copilot},
  year = {2025},
  note = {Accessed: 2025-06-01},
}`;
  const entries = lib.parseBib(bib);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].author, "{GitHub}");
  assert.strictEqual(entries[0].title, "{GitHub Copilot}");
  assert.ok(entries[0].howpublished.includes("github.com/features/copilot"));
  assert.strictEqual(entries[0].year, "2025");
});

test("parses misc Cursor-style malformed braces", () => {
  const bib = `@misc{cursor_2025,
  author = {{Anysphere},
  title = {{Cursor: The AI Code Editor},
  howpublished = {\\url{https://www.cursor.com},
  year = {2025},
}`;
  const entries = lib.parseBib(bib);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].author, "{Anysphere}");
  assert.strictEqual(entries[0].title, "{Cursor: The AI Code Editor}");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── entriesToBib ──");

test("serializes entries back to BibTeX", () => {
  const entries = [{ ENTRYTYPE: "article", ID: "test2023", title: "My Paper", year: "2023" }];
  const bib = lib.entriesToBib(entries);
  assert.ok(bib.includes("@article{test2023,"));
  assert.ok(bib.includes("title = {My Paper}"));
  assert.ok(bib.includes("year = {2023}"));
});

test("skips internal fields starting with _", () => {
  const entries = [{ ENTRYTYPE: "article", ID: "x", title: "T", _source: "crossref" }];
  const bib = lib.entriesToBib(entries);
  assert.ok(!bib.includes("_source"));
});

test("round-trips parse → serialize", () => {
  const original = `@inproceedings{bert2019,
  title = {BERT: Pre-training of Deep Bidirectional Transformers},
  author = {Devlin, Jacob},
  year = {2019},
}`;
  const entries = lib.parseBib(original);
  const serialized = lib.entriesToBib(entries);
  const reparsed = lib.parseBib(serialized);
  assert.strictEqual(reparsed.length, 1);
  assert.strictEqual(reparsed[0].title, entries[0].title);
  assert.strictEqual(reparsed[0].author, entries[0].author);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── titleSimilarity ──");

test("identical titles score 100", () => {
  assert.strictEqual(lib.titleSimilarity("Attention Is All You Need", "Attention Is All You Need"), 100);
});

test("case-insensitive comparison", () => {
  assert.strictEqual(lib.titleSimilarity("attention is all you need", "ATTENTION IS ALL YOU NEED"), 100);
});

test("completely different titles score low", () => {
  const score = lib.titleSimilarity("Attention Is All You Need", "Quantum Chromodynamics at Finite Baryon Density");
  assert.ok(score < 75, `Expected < 75, got ${score}`);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── normalizeText ──");

test("removes diacritics and lowercases", () => {
  assert.strictEqual(lib.normalizeText("René Descartes"), "rene descartes");
});

test("collapses whitespace", () => {
  assert.strictEqual(lib.normalizeText("  hello   world  "), "hello world");
});

test("returns empty for falsy input", () => {
  assert.strictEqual(lib.normalizeText(""), "");
  assert.strictEqual(lib.normalizeText(null), "");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── normalizeAuthorSet ──");

test("extracts last names from 'Last, First' format", () => {
  const names = lib.normalizeAuthorSet("Vaswani, Ashish and Shazeer, Noam");
  assert.ok(names.has("vaswani"));
  assert.ok(names.has("shazeer"));
  assert.strictEqual(names.size, 2);
});

test("extracts last names from 'First Last' format", () => {
  const names = lib.normalizeAuthorSet("Ashish Vaswani and Noam Shazeer");
  assert.ok(names.has("vaswani"));
  assert.ok(names.has("shazeer"));
});

test("returns empty set for empty input", () => {
  assert.strictEqual(lib.normalizeAuthorSet("").size, 0);
  assert.strictEqual(lib.normalizeAuthorSet(null).size, 0);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── normalizePages ──");

test("normalizes different dash styles", () => {
  assert.strictEqual(lib.normalizePages("1--10"), "1-10");
  assert.strictEqual(lib.normalizePages("1 - 10"), "1-10");
  assert.strictEqual(lib.normalizePages("1---10"), "1-10");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── compareAuthors ──");

test("identical authors score 100", () => {
  assert.strictEqual(lib.compareAuthors("Vaswani, Ashish", "Vaswani, Ashish"), 100);
});

test("same last names, different format still match", () => {
  const score = lib.compareAuthors("Vaswani, Ashish and Shazeer, Noam", "Ashish Vaswani and Noam Shazeer");
  assert.strictEqual(score, 100);
});

test("no overlap scores 0", () => {
  assert.strictEqual(lib.compareAuthors("Smith, John", "Doe, Jane"), 0);
});

test("both empty scores 100", () => {
  assert.strictEqual(lib.compareAuthors("", ""), 100);
});

test("one empty scores 0", () => {
  assert.strictEqual(lib.compareAuthors("Smith, John", ""), 0);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── compareField ──");

test("year comparison is exact", () => {
  assert.strictEqual(lib.compareField("year", "2023", "2023"), 100);
  assert.strictEqual(lib.compareField("year", "2023", "2024"), 0);
});

test("doi comparison is exact and case-insensitive", () => {
  assert.strictEqual(lib.compareField("doi", "10.1234/abc", "10.1234/ABC"), 100);
});

test("field comparison ignores protective braces and case", () => {
  assert.strictEqual(lib.compareField("doi", "{10.1234/ABC}", "10.1234/abc"), 100);
  assert.strictEqual(lib.compareField("journal", "Proceedings of the {IEEE}", "proceedings of the IEEE"), 100);
  assert.strictEqual(lib.compareField("booktitle", "Proceedings of {CVPR}", "proceedings of CVPR"), 100);
});

test("format-insensitive fields share one equivalence rule", () => {
  assert.strictEqual(lib.fieldValuesEquivalent("url", "\\url{HTTPS://EXAMPLE.COM/PAPER}", "https://example.com/paper"), true);
  assert.strictEqual(lib.fieldValuesEquivalent("booktitle", "Proceedings of {NeurIPS}", "proceedings of neurips"), true);
  assert.strictEqual(lib.fieldValuesEquivalent("customfield", "{ABC}", "abc"), false);
});

test("pages with different dashes match", () => {
  assert.strictEqual(lib.compareField("pages", "1--10", "1-10"), 100);
});

test("both empty returns 100", () => {
  assert.strictEqual(lib.compareField("journal", "", ""), 100);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── compareEntry ──");

test("verified when all fields match", () => {
  const orig = { title: "Attention Is All You Need", author: "Vaswani, Ashish", year: "2017" };
  const found = { title: "Attention Is All You Need", author: "Vaswani, Ashish", year: "2017" };
  const result = lib.compareEntry(orig, found);
  assert.strictEqual(result.status, "verified");
});

test("updated when fields differ", () => {
  const orig = { title: "Attention Is All You Need", year: "2017" };
  const found = { title: "Attention Is All You Need", year: "2018" };
  const result = lib.compareEntry(orig, found);
  assert.strictEqual(result.status, "updated");
  assert.ok(result.field_diffs.some(d => d.field === "year"));
});

test("needs_review when titles differ significantly", () => {
  const orig = { title: "Attention Is All You Need" };
  const found = { title: "On the Origin of Species" };
  const result = lib.compareEntry(orig, found);
  assert.strictEqual(result.status, "needs_review");
});

test("enrichments don't cause updated status", () => {
  const orig = { title: "Test Paper", year: "2023" };
  const found = { title: "Test Paper", year: "2023", doi: "10.1234/test" };
  const result = lib.compareEntry(orig, found);
  assert.strictEqual(result.status, "verified");
  assert.ok(result.field_diffs.some(d => d.field === "doi"), "should report doi enrichment");
});

test("missing found value for a user-provided field needs update", () => {
  const orig = { title: "Test Paper", year: "2023", note: "Accessed 2026-05-21" };
  const found = { title: "Test Paper", year: "2023" };
  const result = lib.compareEntry(orig, found);
  assert.strictEqual(result.status, "updated");
  assert.ok(result.field_diffs.some(d => d.field === "note" && d.found === ""));
});

test("configured ignored fields are excluded from comparison", () => {
  const orig = { title: "Test Paper", year: "2023", note: "Accessed 2026-05-21" };
  const found = { title: "Test Paper", year: "2023" };
  const result = lib.compareEntry(orig, found, { ignoredFields: ["note"] });
  assert.strictEqual(result.status, "verified");
  assert.ok(!result.field_diffs.some(d => d.field === "note"));
});

test("verified when DOI and journal only differ by braces or case", () => {
  const orig = {
    title: "Test Paper",
    year: "2023",
    journal: "Proceedings of the {IEEE}",
    booktitle: "Proceedings of {CVPR}",
    doi: "{10.1234/ABC}",
  };
  const found = {
    title: "Test Paper",
    year: "2023",
    journal: "proceedings of the IEEE",
    booktitle: "proceedings of cvpr",
    doi: "10.1234/abc",
  };
  const result = lib.compareEntry(orig, found);
  assert.strictEqual(result.status, "verified");
  assert.ok(!result.field_diffs.some(d => d.field === "journal" || d.field === "booktitle" || d.field === "doi"));
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── fieldDiffsForNeedsReview ──");

test("returns empty array when found is null", () => {
  assert.deepStrictEqual(lib.fieldDiffsForNeedsReview({ title: "X" }, null), []);
});

test("includes title and differing fields for a weak title match", () => {
  const orig = {
    title: "My Completely Different Title",
    author: "Smith, Alice",
    year: "2020",
  };
  const found = {
    title: "Attention Is All You Need",
    author: "Vaswani, Ashish",
    year: "2017",
    journal: "NeurIPS",
  };
  const diffs = lib.fieldDiffsForNeedsReview(orig, found);
  assert.ok(diffs.some(d => d.field === "title"));
  assert.ok(diffs.some(d => d.field === "author"));
  assert.ok(diffs.some(d => d.field === "year"));
  assert.ok(diffs.some(d => d.field === "journal"));
});

test("includes enrichment fields from found", () => {
  const orig = { title: "Different Title Here", year: "2023" };
  const found = { title: "Another Title", year: "2023", doi: "10.1000/182" };
  const diffs = lib.fieldDiffsForNeedsReview(orig, found);
  assert.ok(diffs.some(d => d.field === "doi" && d.score === 0), "doi should be enrichment");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── crossrefToStandard ──");

test("converts CrossRef response to standard format", () => {
  const item = {
    title: ["Attention Is All You Need"],
    author: [{ family: "Vaswani", given: "Ashish" }],
    "published-print": { "date-parts": [[2017]] },
    "container-title": ["NeurIPS"],
    DOI: "10.5555/3295222.3295349",
    volume: "30",
    page: "5998-6008",
    type: "proceedings-article",
  };
  const result = lib.crossrefToStandard(item);
  assert.strictEqual(result.title, "Attention Is All You Need");
  assert.strictEqual(result.author, "Vaswani, Ashish");
  assert.strictEqual(result.year, "2017");
  assert.strictEqual(result.journal, "");
  assert.strictEqual(result.booktitle, "NeurIPS");
  assert.strictEqual(result.doi, "10.5555/3295222.3295349");
  assert.strictEqual(result._crossref_type, "proceedings-article");
  assert.strictEqual(result._source, "crossref");
  assert.strictEqual(result._source_url, "https://search.crossref.org/search/works?q=Attention%20Is%20All%20You%20Need&from_ui=yes");
});

test("maps CrossRef journal articles to journal", () => {
  const result = lib.crossrefToStandard({
    title: ["Journal Paper"],
    "published-online": { "date-parts": [[2024, 3, 1]] },
    "container-title": ["IEEE Transactions on Pattern Analysis and Machine Intelligence"],
    type: "journal-article",
  });
  assert.strictEqual(result.year, "2024");
  assert.strictEqual(result.journal, "IEEE Transactions on Pattern Analysis and Machine Intelligence");
  assert.strictEqual(result.booktitle, "");
  assert.strictEqual(lib.classifyVersion(result), "journal");
});

test("uses CrossRef type to classify proceedings and posted content", () => {
  const proceedings = lib.crossrefToStandard({
    title: ["Conference Paper"],
    issued: { "date-parts": [[2023]] },
    event: { name: "Example Conference 2023" },
    type: "proceedings-article",
  });
  const posted = lib.crossrefToStandard({
    title: ["Preprint Paper"],
    "group-title": "Research Square",
    type: "posted-content",
  });

  assert.strictEqual(proceedings.booktitle, "Example Conference 2023");
  assert.strictEqual(lib.classifyVersion(proceedings), "conference");
  assert.strictEqual(posted.journal, "");
  assert.strictEqual(posted.booktitle, "");
  assert.strictEqual(lib.classifyVersion(posted), "preprint");
});

test("handles missing fields gracefully", () => {
  const result = lib.crossrefToStandard({});
  assert.strictEqual(result.title, "");
  assert.strictEqual(result.author, "");
  assert.strictEqual(result.year, "");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── zenodoToStandard ──");

test("converts Zenodo record to standard format", () => {
  const result = lib.zenodoToStandard({
    created: "2024-06-25T13:48:53.539413+00:00",
    doi: "10.5281/zenodo.12531857",
    doi_url: "https://doi.org/10.5281/zenodo.12531857",
    metadata: {
      title: "Leverage the DataCite REST API for metadata discovery and creation",
      publication_date: "2024-06-25",
      creators: [
        { name: "Stathis, Kelly" },
        { name: "Rhoads, Joseph" },
      ],
      resource_type: { title: "Presentation", type: "presentation" },
    },
    links: { self_html: "https://zenodo.org/records/12531857" },
  });

  assert.strictEqual(result.title, "Leverage the DataCite REST API for metadata discovery and creation");
  assert.strictEqual(result.author, "Stathis, Kelly and Rhoads, Joseph");
  assert.strictEqual(result.year, "2024");
  assert.strictEqual(result.doi, "10.5281/zenodo.12531857");
  assert.strictEqual(result.publisher, "Zenodo");
  assert.strictEqual(result.howpublished, "Presentation");
  assert.strictEqual(result.url, "https://zenodo.org/records/12531857");
  assert.strictEqual(result._zenodo_type, "presentation");
  assert.strictEqual(result._source, "zenodo");
  assert.strictEqual(result._source_url, "https://zenodo.org/records/12531857");
});

test("maps Zenodo journal and meeting metadata", () => {
  const journal = lib.zenodoToStandard({
    metadata: {
      title: "Article Archive",
      publication_date: "2022",
      creators: [{ person_or_org: { family_name: "Doe", given_name: "Jane" } }],
      journal: { title: "Journal of Data", volume: "5", issue: "2", pages: "10-15" },
      resource_type: { type: "publication", title: "Publication" },
    },
  });
  const meeting = lib.zenodoToStandard({
    metadata: {
      title: "Conference Slides",
      publication_date: "2023-03",
      meeting: { title: "Example Conference 2023" },
      resource_type: { type: "presentation", title: "Presentation" },
    },
  });

  assert.strictEqual(journal.author, "Doe, Jane");
  assert.strictEqual(journal.journal, "Journal of Data");
  assert.strictEqual(journal.volume, "5");
  assert.strictEqual(journal.number, "2");
  assert.strictEqual(journal.pages, "10-15");
  assert.strictEqual(meeting.booktitle, "Example Conference 2023");
  assert.strictEqual(meeting.journal, "");
});

test("detects Zenodo signals in BibTeX entries", () => {
  assert.strictEqual(lib.hasZenodoSignal({
    publisher: "Zenodo",
    doi: "10.5281/zenodo.14567787",
    url: "https://doi.org/10.5281/zenodo.14567787",
  }), true);
  assert.strictEqual(lib.hasZenodoSignal({
    howpublished: "\\url{https://zenodo.org/records/14567787}",
  }), true);
  assert.strictEqual(lib.hasZenodoSignal({
    publisher: "GitHub",
    doi: "10.1145/1234567",
    url: "https://example.com/artifact",
  }), false);
});

test("extracts Zenodo DOI from common fields", () => {
  assert.strictEqual(
    lib.zenodoDoiFromEntry({ url: "https://doi.org/10.5281/zenodo.14567787" }),
    "10.5281/zenodo.14567787"
  );
  assert.strictEqual(lib.extractZenodoDoiFromText("doi:10.5281/zenodo.12531857"), "10.5281/zenodo.12531857");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── ssToStandard ──");

test("converts Semantic Scholar response to standard format", () => {
  const paper = {
    title: "BERT",
    authors: [{ name: "Jacob Devlin" }, { name: "Ming-Wei Chang" }],
    year: 2019,
    venue: "NAACL",
    paperId: "abc123",
    url: "https://www.semanticscholar.org/paper/abc123",
    externalIds: { DOI: "10.18653/v1/N19-1423" },
  };
  const result = lib.ssToStandard(paper);
  assert.strictEqual(result.title, "BERT");
  assert.strictEqual(result.author, "Devlin, Jacob and Chang, Ming-Wei");
  assert.strictEqual(result.year, "2019");
  assert.strictEqual(result.journal, "NAACL");
  assert.strictEqual(result._source, "semantic_scholar");
  assert.strictEqual(result._source_url, "https://www.semanticscholar.org/paper/abc123");
});

test("prefers publicationVenue.name over venue string", () => {
  const paper = {
    title: "Test",
    authors: [],
    year: 2023,
    venue: "short",
    publicationVenue: { name: "Full Venue Name" },
    externalIds: {},
  };
  const result = lib.ssToStandard(paper);
  assert.strictEqual(result.journal, "Full Venue Name");
});

test("extracts arXiv ID from eprint and DOI fields", () => {
  assert.strictEqual(
    lib.arxivIdFromEntry({ eprinttype: "arXiv", eprint: "2508.10104" }),
    "2508.10104"
  );
  assert.strictEqual(
    lib.arxivIdFromEntry({ doi: "10.48550/ARXIV.2508.10104" }),
    "2508.10104"
  );
});

test("extracts generic DOI from DOI field and URL", () => {
  assert.strictEqual(
    lib.doiFromEntry({ doi: "https://doi.org/10.1145/1234567." }),
    "10.1145/1234567"
  );
  assert.strictEqual(
    lib.doiFromEntry({ url: "https://doi.org/10.48550/arXiv.2508.10104" }),
    "10.48550/arxiv.2508.10104"
  );
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── dblpToStandard ──");

test("converts DBLP response with mixed field shapes", () => {
  const result = lib.dblpToStandard({
    title: "Example DBLP Paper.",
    authors: { author: [{ text: "Doe, Jane" }, "John Smith", null] },
    venue: ["ICML"],
    year: 2024,
    type: "Conference and Workshop Papers",
    pages: { text: "1-12" },
    doi: "10.1145/123",
    ee: [{ text: "https://doi.org/10.1145/123" }],
    url: "https://dblp.org/rec/conf/icml/example",
  });

  assert.strictEqual(result.title, "Example DBLP Paper");
  assert.strictEqual(result.author, "Doe, Jane and Smith, John");
  assert.strictEqual(result.year, "2024");
  assert.strictEqual(result.booktitle, "ICML");
  assert.strictEqual(result.pages, "1-12");
  assert.strictEqual(result._source_url, "https://dblp.org/rec/conf/icml/example");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── openreviewToStandard ──");

test("converts OpenReview search note without bibtex", () => {
  const result = lib.openreviewToStandard({
    id: "abc123",
    forum: "forum123",
    content: {
      title: { value: "OpenReview Paper" },
      authors: { value: ["Jane Doe", "John Smith"] },
      venue: { value: "ICLR 2025" },
      html: { value: "https://openreview.net/forum?id=forum123" },
    },
  });

  assert.strictEqual(result.title, "OpenReview Paper");
  assert.strictEqual(result.author, "Jane Doe and John Smith");
  assert.strictEqual(result.year, "2025");
  assert.strictEqual(result.booktitle, "ICLR 2025");
  assert.strictEqual(result._source, "openreview");
  assert.strictEqual(result._source_url, "https://openreview.net/forum?id=forum123");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── extractLastNames ──");

test("extracts from 'Last, First and Last, First' format", () => {
  const names = lib.extractLastNames("Vaswani, Ashish and Shazeer, Noam");
  assert.ok(names.has("vaswani"));
  assert.ok(names.has("shazeer"));
});

test("extracts from 'First Last' format", () => {
  const names = lib.extractLastNames("Ashish Vaswani");
  assert.ok(names.has("vaswani"));
});

test("returns empty set for empty input", () => {
  assert.strictEqual(lib.extractLastNames("").size, 0);
  assert.strictEqual(lib.extractLastNames(null).size, 0);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── isSamePaper ──");

test("same paper returns true", () => {
  const a = { title: "Attention Is All You Need", year: "2017", author: "Vaswani, Ashish" };
  const b = { title: "Attention Is All You Need", year: "2017", author: "Vaswani, Ashish" };
  assert.strictEqual(lib.isSamePaper(a, b), true);
});

test("different titles returns false", () => {
  const a = { title: "Paper A" };
  const b = { title: "Completely Different Paper" };
  assert.strictEqual(lib.isSamePaper(a, b), false);
});

test("different years returns false", () => {
  const a = { title: "Attention Is All You Need", year: "2017" };
  const b = { title: "Attention Is All You Need", year: "2020" };
  assert.strictEqual(lib.isSamePaper(a, b), false);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── mergeMetadata ──");

test("primary fields take precedence", () => {
  const primary = { title: "A", year: "2020", _source: "ss" };
  const secondary = { title: "B", year: "2021", doi: "10.1234", _source: "cr" };
  const merged = lib.mergeMetadata(primary, secondary);
  assert.strictEqual(merged.title, "A");
  assert.strictEqual(merged.year, "2020");
  assert.strictEqual(merged.doi, "10.1234");
  assert.strictEqual(merged._source, "ss+cr");
});

test("fills empty fields from secondary", () => {
  const primary = { title: "A", _source: "ss" };
  const secondary = { doi: "10.1234", volume: "5", _source: "cr" };
  const merged = lib.mergeMetadata(primary, secondary);
  assert.strictEqual(merged.doi, "10.1234");
  assert.strictEqual(merged.volume, "5");
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── bestMatch ──");

test("returns best matching candidate above threshold", () => {
  const candidates = [
    { title: "Completely Wrong" },
    { title: "Attention Is All You Need" },
  ];
  const result = lib.bestMatch(candidates, "Attention Is All You Need");
  assert.strictEqual(result.title, "Attention Is All You Need");
});

test("returns null when no candidate meets threshold", () => {
  const candidates = [{ title: "Quantum Chromodynamics at Finite Baryon Density" }];
  const result = lib.bestMatch(candidates, "Attention Is All You Need");
  assert.strictEqual(result, null);
});

test("returns null for empty candidates", () => {
  assert.strictEqual(lib.bestMatch([], "test"), null);
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n── verifyEntryLayered ──");

test("layered verification compares venue names directly", () => {
  const entry = { ENTRYTYPE: "inproceedings", title: "Attention Is All You Need", author: "Vaswani, Ashish", year: "2017", booktitle: "NeurIPS" };
  const candidate = { title: "Attention Is All You Need", author: "Ashish Vaswani", year: "2017", journal: "Advances in Neural Information Processing Systems", _source: "semantic_scholar" };
  const result = lib.verifyEntryLayered(entry, [candidate]);
  assert.strictEqual(result.layers.existence, "found");
  assert.strictEqual(result.layers.identity, "same_work");
  assert.strictEqual(result.evidence[0].venueMatch, false);
  assert.strictEqual(result.evidence[0].entryVenue, "neurips");
  assert.strictEqual(result.evidence[0].candidateVenue, "advances in neural information processing systems");
});
// ═══════════════════════════════════════════════════════════════════════
console.log("\n── Constants ──");

test("TITLE_MATCH_THRESHOLD is reasonable", () => {
  assert.ok(lib.TITLE_MATCH_THRESHOLD >= 70 && lib.TITLE_MATCH_THRESHOLD <= 100);
});

test("MIN_TITLE_SIM is reasonable", () => {
  assert.ok(lib.MIN_TITLE_SIM >= 50 && lib.MIN_TITLE_SIM <= 90);
});

test("COMPARED_FIELDS contains expected fields", () => {
  assert.ok(lib.COMPARED_FIELDS.includes("author"));
  assert.ok(lib.COMPARED_FIELDS.includes("year"));
  assert.ok(lib.COMPARED_FIELDS.includes("doi"));
});

test("FORMAT_INSENSITIVE_FIELDS contains common string fields", () => {
  assert.ok(lib.FORMAT_INSENSITIVE_FIELDS.includes("doi"));
  assert.ok(lib.FORMAT_INSENSITIVE_FIELDS.includes("journal"));
  assert.ok(lib.FORMAT_INSENSITIVE_FIELDS.includes("booktitle"));
  assert.ok(lib.FORMAT_INSENSITIVE_FIELDS.includes("url"));
});

// ═══════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);


