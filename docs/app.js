(() => {
  "use strict";
  const B = window.BibLib;
  const BV = window.BibVerify;

  // ─── i18n ─────────────────────────────────────────────────────────────
  const LANGS = {
    en: {
      upload_tab: "Upload file", paste_tab: "Paste BibTeX",
      drop_label: "Drop your .bib file here or click to browse",
      drop_sub: "Standard BibTeX & BibLaTeX · Processed entirely in your browser",
      paste_btn: "Parse BibTeX",
      paste_placeholder: "Paste your BibTeX content here, e.g. from Overleaf...\n\n@article{example2024,\n  title={Your Paper Title},\n  author={Author, First and Author, Second},\n  year={2024},\n  journal={Some Journal}\n}",
      start_verification: "Start verification", pause: "Pause", resume: "Continue",
      download: "Download Corrected .bib",
      badge_parsed: "Parsed", badge_review_all: "Review",
      badge_review: "Needs Update", badge_notfound: "Not Found",
      badge_duplicates: "Duplicates", badge_error: "Error",
      status_parsed: "Parsed", status_verified: "Review", status_updated: "Review",
      status_needs_review: "Review", status_needs_update: "Review", status_not_found: "Not Found",
      status_error: "Error", status_duplicate: "Duplicate",
      view_original: "Original", view_found: "Found", view_edit: "Edit", view_diff: "Diff",
      adopt_found: "Adopt all found values", close: "×",
      candidates_title: "Search Results", candidates_more: "more", candidates_less: "less",
      selected: "selected",
      log_events: "events", log_clear: "Clear",
      preparing: "Preparing...", verifying: "Verifying",
      done: "Done", entries_parsed: "entries parsed", entries_verified: "entries verified",
      no_title: "(no title)",
      not_found_msg: "No matching publication found.", no_title_msg: "No title, cannot search.",
      dup_of: "Duplicate of",
      similarity: "similarity to",
      fields_count: "Fields",
      detail_compare: "Compare & Edit",
      no_entries: "No BibTeX entries found.",
      upload_bib_only: "Please upload a .bib file.",
      paste_first: "Please paste your BibTeX content first.",
      select_source: "Select at least one search source.",
      settings_title: "Search Sources (Tiered)",
      settings_help: "Layered search: non-publication links are checked directly; Zenodo and arXiv are always enabled as fallback sources; selected published-record sources run before OpenReview.",
      tier1: "Tier 1 — Published Records", tier2: "Publication Signals", tier3: "Fallback Sources",
      copy: "Copy", copied: "Copied!",
      toc_title: "Contents",
      clear_field: "Clear field",
      api_keys_title: "API Keys",
      api_keys_help: "Optional. Keys unlock higher rate limits. Keys stay in this page session unless you choose to remember them.",
      api_key_placeholder: "Paste API key here…",
      remember_api_key: "Remember on this browser",
      api_key_auth_error: "API key rejected — clear the field if you don't have one.",
      api_key_auth_error_401: "API key invalid (401 Unauthorized). Please check or clear the key.",
      api_key_auth_error_403: "API key forbidden (403 Forbidden). Please check or clear the key.",
      review_mode_title: "Field Restrictions",
      review_mode_help: "List fields to ignore before checking consistency. Leave empty to check every field present in your BibTeX entry.",
      ignored_fields_label: "Ignored fields",
      ignored_fields_placeholder: "note, url, urldate",
    },
    zh: {
      upload_tab: "上传文件", paste_tab: "粘贴 BibTeX",
      drop_label: "将 .bib 文件拖放至此处，或点击浏览",
      drop_sub: "支持标准 BibTeX 和 BibLaTeX · 完全在浏览器中处理",
      paste_btn: "解析 BibTeX",
      paste_placeholder: "在此粘贴 BibTeX 内容，例如来自 Overleaf...\n\n@article{example2024,\n  title={Your Paper Title},\n  author={Author, First and Author, Second},\n  year={2024},\n  journal={Some Journal}\n}",
      start_verification: "开始验证", pause: "暂停", resume: "继续",
      download: "下载修正后的 .bib",
      badge_parsed: "已解析", badge_review_all: "复核",
      badge_review: "需要更新", badge_notfound: "未找到",
      badge_duplicates: "重复", badge_error: "错误",
      status_parsed: "已解析", status_verified: "复核", status_updated: "复核",
      status_needs_review: "复核", status_needs_update: "复核", status_not_found: "未找到",
      status_error: "错误", status_duplicate: "重复",
      view_original: "原始内容", view_found: "检索结果", view_edit: "编辑区", view_diff: "差异对比",
      adopt_found: "采用所有检索结果", close: "×",
      candidates_title: "检索结果", candidates_more: "更多", candidates_less: "收起",
      selected: "当前",
      log_events: "条记录", log_clear: "清空",
      preparing: "准备中...", verifying: "正在验证",
      done: "完成", entries_parsed: "条已解析", entries_verified: "条已验证",
      no_title: "（无标题）",
      not_found_msg: "未找到匹配的出版物。", no_title_msg: "无标题，无法搜索。",
      dup_of: "与以下条目重复：",
      similarity: "与以下文献相似度",
      fields_count: "字段",
      detail_compare: "对比 & 编辑",
      no_entries: "未找到 BibTeX 条目。",
      upload_bib_only: "请上传 .bib 文件。",
      paste_first: "请先粘贴 BibTeX 内容。",
      select_source: "请至少选择一个检索来源。",
      settings_title: "检索来源（分层）",
      settings_help: "分层检索：非文献链接会直接检查；Zenodo 和 arXiv 作为保底来源始终启用；已勾选的出版记录来源会先于 OpenReview 运行。",
      tier1: "第一层 — 已出版记录", tier2: "出版线索", tier3: "保底来源",
      copy: "复制", copied: "已复制！",
      toc_title: "目录",
      clear_field: "清空字段",
      api_keys_title: "API Keys",
      api_keys_help: "可选。配置后可提升请求频率上限。默认仅在当前页面会话保存，勾选记住后才写入本浏览器。",
      api_key_placeholder: "粘贴 API Key…",
      remember_api_key: "在本浏览器记住",
      api_key_auth_error: "API Key 验证失败——如果没有 Key 请清空该输入框。",
      api_key_auth_error_401: "API Key 无效（401 Unauthorized），请检查或清空 Key。",
      api_key_auth_error_403: "API Key 被拒绝（403 Forbidden），请检查或清空 Key。",
      review_mode_title: "字段限制",
      review_mode_help: "先忽略你列出的字段，再检查一致性。留空则检查用户 BibTeX 中已存在的所有字段。",
      ignored_fields_label: "忽略字段",
      ignored_fields_placeholder: "note, url, urldate",
    }
  };
  let lang = localStorage.getItem("bv-lang") || "en";
  function t(k) { return (LANGS[lang] || LANGS.en)[k] || k; }
  function setLang(l) { lang = l; localStorage.setItem("bv-lang", l); applyLang(); }
  let _appReady = false;

  // ─── Theme ─────────────────────────────────────────────────────────────
  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");
  function applyTheme(th) { root.setAttribute("data-theme", th); localStorage.setItem("bv-theme", th); }
  applyTheme(localStorage.getItem("bv-theme") || (window.matchMedia("(prefers-color-scheme:light)").matches ? "light" : "dark"));
  themeToggle.addEventListener("click", () => applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"));

  // ─── Language toggle button ────────────────────────────────────────────
  const heroTopRight = document.querySelector(".hero-top-right");
  const langBtn = document.createElement("button");
  langBtn.className = "lang-toggle";
  langBtn.title = "Switch language / 切换语言";
  heroTopRight.insertBefore(langBtn, heroTopRight.firstChild);
  langBtn.addEventListener("click", () => setLang(lang === "en" ? "zh" : "en"));

  function applyLang() {
    langBtn.textContent = lang === "en" ? "中文" : "EN";
    const tabs = document.querySelectorAll(".input-tab");
    if (tabs[0]) tabs[0].textContent = t("upload_tab");
    if (tabs[1]) tabs[1].textContent = t("paste_tab");
    const dropLabel = document.querySelector(".upload-zone .label");
    if (dropLabel) dropLabel.textContent = t("drop_label");
    const dropSub = document.querySelector(".upload-zone p");
    if (dropSub) dropSub.textContent = t("drop_sub");
    const pasteBtn = document.getElementById("btn-verify-paste");
    if (pasteBtn) pasteBtn.textContent = t("paste_btn");
    const pasteArea = document.getElementById("bib-paste");
    if (pasteArea) pasteArea.placeholder = t("paste_placeholder");
    updateSummary();
    const btnDl = document.getElementById("btn-download");
    if (btnDl) btnDl.textContent = t("download");
    const btnStart = document.getElementById("btn-start-verification");
    if (btnStart && vState === "idle") btnStart.textContent = t("start_verification");
    else if (btnStart && vState === "running") btnStart.textContent = t("pause");
    else if (btnStart && vState === "paused") btnStart.textContent = t("resume");
    const logClear = document.getElementById("activity-log-clear");
    if (logClear) logClear.textContent = t("log_clear");
    if (activityLogCount) activityLogCount.textContent = logCount + " " + t("log_events");
    const settingsTitle = document.querySelector(".settings-section-title");
    if (settingsTitle) settingsTitle.textContent = t("settings_title");
    const settingHelp = document.querySelector(".setting-help");
    if (settingHelp) settingHelp.textContent = t("settings_help");
    const apiKeysTitle = document.getElementById("api-keys-title");
    if (apiKeysTitle) apiKeysTitle.textContent = t("api_keys_title");
    const apiKeysHelp = document.getElementById("api-keys-help");
    if (apiKeysHelp) apiKeysHelp.textContent = t("api_keys_help");
    const reviewModeTitle = document.getElementById("review-mode-title");
    if (reviewModeTitle) reviewModeTitle.textContent = t("review_mode_title");
    const reviewModeHelp = document.getElementById("review-mode-help");
    if (reviewModeHelp) reviewModeHelp.textContent = t("review_mode_help");
    renderSearchEngineOptions();
    renderReviewOptions();
    renderApiKeyOptions();
    const tocTitleEl = document.getElementById("toc-title");
    if (tocTitleEl) tocTitleEl.textContent = t("toc_title");
    if (_appReady && results.length) { entryList.innerHTML = ""; cardOrder.forEach(idx => results[idx] && renderEntryCard(results[idx])); applyCurrentFilter(); rebuildToc(); }
  }

  // ─── UI State ─────────────────────────────────────────────────────────
  let parsedEntries = [], parseDiags = [], results = [], decisions = {}, fieldEdits = {}, cardOrder = [];
  let expandedCards = new Set(), openedCards = new Set();
  let activeFilter = "all", vState = "idle", currentDetailIdx = -1, resolveWait = null;
  const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
  const uploadZone = $(".upload-zone"), fileInput = $("#file-input"), resultsSection = $(".results-section");
  const entryList = $(".entry-list"), floatingBar = $("#floating-bar"), barProgress = $("#bar-progress");
  const barProgressFill = $(".bar-progress-fill"), barProgressText = $(".bar-progress-text");
  const btnStartVerify = $("#btn-start-verification"), btnDownload = $("#btn-download");
  const searchEngineOptions = $("#search-engine-options");
  const activityLogLines = $("#activity-log-lines"), activityLogCount = $("#activity-log-count");

  function isNeedsUpdateStatus(status) {
    return status === "needs_update" || status === "updated" || status === "needs_review";
  }

  function hasEditableDetail(status) {
    return status === "verified" || isNeedsUpdateStatus(status);
  }

  function filterMatchesResult(r, filter) {
    if (filter === "all") return true;
    if (filter === "duplicate") return !!r.duplicate_of;
    if (filter === "review") return hasEditableDetail(r.status);
    if (filter === "needs_update") return isNeedsUpdateStatus(r.status);
    return r.status === filter;
  }

  function filteredOrderedResults(filter = activeFilter) {
    return cardOrder.map(idx => results[idx]).filter(r => r && filterMatchesResult(r, filter));
  }

  function updateCardPositionMarkers(items = filteredOrderedResults()) {
    const total = items.length;
    items.forEach((r, i) => {
      const el = document.querySelector('#card-' + r.index + ' .entry-list-position');
      if (!el) return;
      el.textContent = '[' + (i + 1) + '/' + total + ']';
      el.title = (i + 1) + ' / ' + total;
    });
  }

  // ─── TOC sidebar ───────────────────────────────────────────────────────
  const tocSidebar  = $("#toc-sidebar");
  const tocOpenBtn  = $("#toc-open-btn");
  const tocBody     = $("#toc-body");
  const tocToggle   = $("#toc-toggle");
  let tocCollapsed  = false;
  let tocObserver   = null;

  function rebuildToc() {
    const items = filteredOrderedResults();
    updateCardPositionMarkers(items);
    if (!tocBody) return;
    tocBody.innerHTML = "";
    if (!items.length) { hideToc(); return; }
    items.forEach((r, i) => {
      const el = document.createElement("div");
      el.className = "toc-item";
      el.dataset.tocEntry = r.index;
      const dotCls = r.duplicate_of ? "toc-dot-duplicate" : (hasEditableDetail(r.status) ? "toc-dot-review" : "toc-dot-" + r.status);
      el.innerHTML =
        '<span class="toc-item-num">' + (i + 1) + '</span>' +
        '<span class="toc-item-status ' + dotCls + '"></span>' +
        '<span class="toc-item-title">' + esc(r.title || t("no_title")) + '</span>';
      el.addEventListener("click", () => scrollToCard(r.index));
      tocBody.appendChild(el);
    });
    showToc();
    rewireTocObserver(items);
  }

  function scrollToCard(idx) {
    const card = document.getElementById("card-" + idx);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    card.classList.remove("toc-flash");
    void card.offsetWidth;
    card.classList.add("toc-flash");
  }

  function rewireTocObserver(items) {
    if (tocObserver) tocObserver.disconnect();
    tocObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const idx = parseInt(en.target.dataset.index);
        const tocItem = tocBody.querySelector('[data-toc-entry="' + idx + '"]');
        if (tocItem) tocItem.classList.toggle("toc-active", en.isIntersecting);
      });
    }, { threshold: 0.15 });
    items.forEach(r => {
      const card = document.getElementById("card-" + r.index);
      if (card) tocObserver.observe(card);
    });
  }

  function showToc() {
    if (!tocSidebar) return;
    if (!tocCollapsed) {
      tocSidebar.classList.add("visible");
      if (tocOpenBtn) tocOpenBtn.classList.remove("visible");
    } else {
      if (tocOpenBtn) tocOpenBtn.classList.add("visible");
    }
  }

  function hideToc() {
    if (tocSidebar) tocSidebar.classList.remove("visible");
    if (tocOpenBtn) tocOpenBtn.classList.remove("visible");
  }

  if (tocToggle) tocToggle.addEventListener("click", () => {
    tocCollapsed = true;
    tocSidebar.classList.remove("visible");
    if (tocOpenBtn && tocBody.children.length) tocOpenBtn.classList.add("visible");
  });

  if (tocOpenBtn) tocOpenBtn.addEventListener("click", () => {
    tocCollapsed = false;
    tocOpenBtn.classList.remove("visible");
    if (tocBody.children.length) tocSidebar.classList.add("visible");
  });
  let logCount = 0;
  function addLog(level, text) {
    if (!activityLogLines) return;
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2,"0")).join(":");
    const line = document.createElement("div");
    line.className = "activity-line activity-line-" + level;
    line.innerHTML = '<span class="activity-line-time">' + time + '</span><span class="activity-line-level">' + level + '</span><span class="activity-line-text">' + esc(text) + '</span>';
    activityLogLines.appendChild(line);
    activityLogLines.scrollTop = activityLogLines.scrollHeight;
    logCount++;
    if (activityLogCount) activityLogCount.textContent = logCount + " " + t("log_events");
  }

  // ─── Search engine options ─────────────────────────────────────────────
  function renderSearchEngineOptions() {
    if (!searchEngineOptions) return;
    const prev = {};
    searchEngineOptions.querySelectorAll("input[data-engine]").forEach(el => { prev[el.dataset.engine] = el.checked; });
    const tiers = [
      { key: "tier1", engines: [
        { id: "crossref", label: "CrossRef" }, { id: "semantic_scholar", label: "Semantic Scholar" }, { id: "dblp", label: "DBLP" }
      ]},
      { key: "tier2", engines: [
        { id: "openreview", label: "OpenReview" }
      ]},
      { key: "tier3", fixed: true, engines: [{ id: "zenodo", label: "Zenodo" }, { id: "arxiv", label: "arXiv" }] }
    ];
    let html = "";
    for (const tier of tiers) {
      html += '<div class="engine-tier"><div class="tier-label">' + esc(t(tier.key)) + '</div><div class="tier-engines">';
      for (const e of tier.engines) {
        if (tier.fixed) {
          html += '<span class="engine-option engine-option-fixed" data-engine-fixed="' + escAttr(e.id) + '"><span class="engine-fixed-icon">on</span><span>' + esc(e.label) + '</span></span>';
        } else {
          const checked = Object.prototype.hasOwnProperty.call(prev, e.id) ? prev[e.id] : true;
          html += '<label class="option-toggle engine-option"><input type="checkbox" class="opt-search-engine" data-engine="' + e.id + '"' + (checked ? " checked" : "") + ' /><span>' + esc(e.label) + '</span></label>';
        }
      }
      html += '</div></div>';
    }
    searchEngineOptions.innerHTML = html;
  }
  function getSelectedSearchEngines() {
    return [...new Set([...document.querySelectorAll(".opt-search-engine[data-engine]:checked")].map(el => el.dataset.engine).concat(["zenodo", "arxiv"]))];
  }
  renderSearchEngineOptions();

  // Review mode options
  function parseIgnoredFields(value) {
    return String(value || "")
      .split(/[,\s]+/)
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
  }

  function renderReviewOptions() {
    const container = document.getElementById("review-mode-options");
    if (!container) return;
    const ignored = localStorage.getItem("bv-ignored-fields") || "";
    container.innerHTML =
      '<label class="ignored-fields-row"><span>' + esc(t("ignored_fields_label")) + '</span>' +
        '<input class="ignored-fields-input" type="text" value="' + escAttr(ignored) + '" placeholder="' + escAttr(t("ignored_fields_placeholder")) + '" />' +
      '</label>';
    const ignoredInput = container.querySelector(".ignored-fields-input");
    if (ignoredInput) {
      ignoredInput.addEventListener("input", () => localStorage.setItem("bv-ignored-fields", ignoredInput.value));
    }
  }

  function getComparisonOptions() {
    return {
      ignoredFields: parseIgnoredFields(localStorage.getItem("bv-ignored-fields") || ""),
    };
  }

  renderReviewOptions();

  // ─── API Key options ───────────────────────────────────────────────────
  const API_KEY_SOURCES = [
    { id: "semantic_scholar", label: "Semantic Scholar", storageKey: "bv-apikey-ss",
      link: "https://www.semanticscholar.org/product/api" },
  ];
  const sessionApiKeys = {};

  function renderApiKeyOptions() {
    const container = document.getElementById("api-keys-options");
    if (!container) return;
    container.innerHTML = "";
    for (const src of API_KEY_SOURCES) {
      const saved = localStorage.getItem(src.storageKey) || "";
      const current = Object.prototype.hasOwnProperty.call(sessionApiKeys, src.id) ? sessionApiKeys[src.id] : saved;
      const row = document.createElement("div");
      row.className = "api-key-row";
      row.id = "api-key-row-" + src.id;
      row.innerHTML =
        '<label class="api-key-label"><a class="api-key-source-link" href="' + escAttr(src.link) + '" target="_blank" rel="noopener">' + esc(src.label) + '</a></label>' +
        '<input class="api-key-input" type="password" data-source="' + escAttr(src.id) + '" placeholder="' + esc(t("api_key_placeholder")) + '" value="' + escAttr(current) + '" autocomplete="off" spellcheck="false" />' +
        '<label class="option-toggle api-key-remember"><input type="checkbox" class="api-key-remember-input" data-source="' + escAttr(src.id) + '"' + (saved ? " checked" : "") + ' /><span>' + esc(t("remember_api_key")) + '</span></label>';
      container.appendChild(row);
    }
    container.querySelectorAll(".api-key-input").forEach(input => {
      input.addEventListener("input", () => {
        const src = API_KEY_SOURCES.find(s => s.id === input.dataset.source);
        if (!src) return;
        // clear any previous auth error when user edits the key
        clearApiKeyError(src.id);
        const val = input.value.trim();
        sessionApiKeys[src.id] = val;
        const remember = container.querySelector('.api-key-remember-input[data-source="' + src.id + '"]')?.checked;
        if (remember && val) localStorage.setItem(src.storageKey, val);
        else localStorage.removeItem(src.storageKey);
      });
    });
    container.querySelectorAll(".api-key-remember-input").forEach(remember => {
      remember.addEventListener("change", () => {
        const src = API_KEY_SOURCES.find(s => s.id === remember.dataset.source);
        if (!src) return;
        const input = container.querySelector('.api-key-input[data-source="' + src.id + '"]');
        const val = (input?.value || "").trim();
        sessionApiKeys[src.id] = val;
        if (remember.checked && val) localStorage.setItem(src.storageKey, val);
        else localStorage.removeItem(src.storageKey);
      });
    });
  }

  function showApiKeyError(sourceId, statusCode) {
    const row = document.getElementById("api-key-row-" + sourceId);
    if (!row) return;
    row.classList.add("api-key-row-error");
    const input = row.querySelector(".api-key-input");
    if (input) input.classList.add("api-key-input-error");
    if (!row.querySelector(".api-key-error-msg")) {
      const msg = document.createElement("div");
      msg.className = "api-key-error-msg";
      msg.innerHTML = t("api_key_auth_error_" + statusCode) || t("api_key_auth_error");
      row.appendChild(msg);
    }
    // also open the settings popover so the user notices
    settingsPopover.classList.add("open");
    settingsToggle.classList.add("active");
  }

  function clearApiKeyError(sourceId) {
    const row = document.getElementById("api-key-row-" + sourceId);
    if (!row) return;
    row.classList.remove("api-key-row-error");
    const input = row.querySelector(".api-key-input");
    if (input) input.classList.remove("api-key-input-error");
    row.querySelector(".api-key-error-msg")?.remove();
  }

  function getApiKey(sourceId) {
    const src = API_KEY_SOURCES.find(s => s.id === sourceId);
    if (!src) return "";
    if (Object.prototype.hasOwnProperty.call(sessionApiKeys, sourceId)) return sessionApiKeys[sourceId] || "";
    return localStorage.getItem(src.storageKey) || "";
  }

  renderApiKeyOptions();

  // Register auth-error callback so app-core can notify us
  BV.setAuthErrCb((source, statusCode) => {
    const srcId = source === "ss" ? "semantic_scholar" : source;
    addLog("error", t("api_key_auth_error") + " (" + srcId + " HTTP " + statusCode + ")");
    showApiKeyError(srcId, statusCode);
  });

  // ─── Tab switching ─────────────────────────────────────────────────────
  $$(".input-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".input-tab").forEach(t => t.classList.remove("active"));
      $$(".tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      $("#tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  // ─── Upload / Paste ────────────────────────────────────────────────────
  uploadZone.addEventListener("click", () => fileInput.click());
  uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("dragover"); });
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
  uploadZone.addEventListener("drop", e => { e.preventDefault(); uploadZone.classList.remove("dragover"); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
  async function handleFile(file) { if (!file.name.endsWith(".bib")) { alert(t("upload_bib_only")); return; } parseAndShow(await file.text()); }

  const bibPaste = $("#bib-paste"), btnVerifyPaste = $("#btn-verify-paste");
  btnVerifyPaste.addEventListener("click", () => { const c = bibPaste.value.trim(); if (!c) { alert(t("paste_first")); return; } parseAndShow(c); });

  // ─── Parse & Show ──────────────────────────────────────────────────────
  function parseAndShow(content) {
    results = []; decisions = {}; fieldEdits = {}; cardOrder = []; expandedCards = new Set(); openedCards = new Set(); activeFilter = "all"; vState = "idle";
    currentDetailIdx = -1;
    entryList.innerHTML = ""; logCount = 0;
    if (activityLogLines) activityLogLines.innerHTML = "";
    if (activityLogCount) activityLogCount.textContent = "0 " + t("log_events");
    $$(".info-section").forEach(s => s.style.display = "none");
    resultsSection.style.display = "none";
    floatingBar.classList.add("visible"); barProgress.classList.remove("active");

    const doc = B.parseBibDocument(content);
    parsedEntries = doc.entries; parseDiags = doc.diagnostics || [];
    if (!parsedEntries.length) { alert(t("no_entries")); floatingBar.classList.remove("visible"); return; }
    resultsSection.style.display = "block";
    const seenTitles = new Map();
    for (let i = 0; i < parsedEntries.length; i++) {
      const entry = parsedEntries[i], title = entry.title || "", entryId = entry.ID || "entry_" + i;
      const normKey = B.normalizeTitle(title);
      let dupOf = null;
      if (normKey && seenTitles.has(normKey)) dupOf = seenTitles.get(normKey);
      else if (normKey) seenTitles.set(normKey, entryId);
      const entryDiags = parseDiags.filter(d => d.entry_id === entryId && d.severity === "error");
      let status = "parsed";
      if (entryDiags.length > 0) status = "error";
      else if (dupOf) status = "duplicate";
      results.push({
        index: i, entry_id: entryId, entry_type: entry.ENTRYTYPE || "", title, status,
        title_score: 0, field_diffs: [], suggested: {}, found_title: "", update_kind: "",
        duplicate_of: dupOf,
        found: null, candidates: [], selectedCandidateIdx: 0
      });
    }
    cardOrder = results.map(r => r.index);
    cardOrder.forEach(idx => renderEntryCard(results[idx]));
    updateSummary(); rebuildToc();
    btnStartVerify.classList.remove("hidden"); btnStartVerify.textContent = t("start_verification");
    checkExportAllowed();
    barProgressText.textContent = parsedEntries.length + " " + t("entries_parsed");
  }

  // ─── Start / Pause / Resume ────────────────────────────────────────────
  btnStartVerify.addEventListener("click", () => {
    if (vState === "idle") {
      if (!getSelectedSearchEngines().length) { alert(t("select_source")); return; }
      vState = "running"; btnStartVerify.textContent = t("pause"); runVerification();
    } else if (vState === "running") {
      vState = "paused"; btnStartVerify.textContent = t("resume");
    } else if (vState === "paused") {
      vState = "running"; btnStartVerify.textContent = t("pause"); if (resolveWait) { resolveWait(); resolveWait = null; }
    }
  });
  async function waitIfPaused() { while (vState === "paused") await new Promise(r => { resolveWait = r; }); }

  async function runVerification() {
    const total = parsedEntries.length;
    barProgress.classList.add("active"); barProgress.classList.remove("fade-out");
    barProgressFill.style.width = "0%"; barProgressFill.classList.remove("done");
    for (let i = 0; i < total; i++) {
      if (vState !== "running" && vState !== "paused") break;
      await waitIfPaused(); if (vState !== "running") break;
      const r = results[i];
      if (r.status !== "parsed") continue;
      const entry = parsedEntries[i], title = entry.title || "";
      const pct = Math.round(((i + 1) / total) * 100);
      barProgressFill.style.width = pct + "%";
      barProgressText.textContent = t("verifying") + " " + (i+1) + " / " + total + ": " + title.slice(0, 50);
      if (!title.trim() && !(B.isLikelyNonPublicationEntry && B.isLikelyNonPublicationEntry(entry))) { addLog("warning", "Skipped entry without title: " + r.entry_id); r.status = "not_found"; replaceCard(i); updateSummary(); continue; }
      let lookupResult = { best: null, candidates: [] };
      try { lookupResult = await BV.lookupTiered(title || entry.ID || "", entry, addLog, getSelectedSearchEngines, getApiKey); } catch (err) { console.warn("Lookup failed:", err); }
      const { best: found, candidates } = lookupResult;
      r.candidates = candidates || [];
      r.selectedCandidateIdx = 0;
      addLog("info", "Candidates for " + r.entry_id + ": " + r.candidates.length);
      if (!found) {
        r.status = "not_found"; r.found = null;
        addLog("decision", "Decision " + r.entry_id + ": Not Found");
      } else {
        applyCandidate(r, entry, found);
        addLog("decision", "Decision " + r.entry_id + ": " + statusLabel(r.status) + " (" + (found._source || "unknown") + ")");
      }
      replaceCard(i, { appendToEnd: isNeedsUpdateStatus(r.status) }); updateSummary(); rebuildToc();
    }
    vState = "done"; barProgressFill.classList.add("done");
    barProgressText.textContent = t("done") + " — " + total + " " + t("entries_verified");
    btnStartVerify.textContent = t("start_verification"); btnStartVerify.classList.add("hidden");
    checkExportAllowed();
    setTimeout(() => { barProgress.classList.add("fade-out"); setTimeout(() => barProgress.classList.remove("active", "fade-out"), 350); }, 800);
  }

  function applyCandidate(r, entry, found) {
    const comparisonOptions = getComparisonOptions();
    const cmp = B.compareEntry(entry, found, comparisonOptions);
    let fd = cmp.field_diffs;
    if (cmp.status === "needs_review" && found) fd = B.fieldDiffsForNeedsReview(entry, found, comparisonOptions);
    r.update_kind = isNeedsUpdateStatus(cmp.status) ? cmp.status : "";
    r.status = isNeedsUpdateStatus(cmp.status) ? "needs_update" : cmp.status;
    r.title_score = cmp.title_score; r.field_diffs = fd;
    r.suggested = cmp.suggested; r.found_title = found.title || ""; r.found = found;
  }

  function checkExportAllowed() {
    btnDownload.classList.remove("hidden");
    btnDownload.classList.add("fade-in");
    const errCount    = results.filter(r => r.status === "error").length;
    const nfCount     = results.filter(r => r.status === "not_found").length;
    const dupCount    = results.filter(r => r.duplicate_of).length;
    let warnEl = document.getElementById("export-warn");
    if (errCount || nfCount || dupCount) {
      const parts = [];
      if (errCount) parts.push(errCount + " " + t("badge_error").toLowerCase());
      if (nfCount)  parts.push(nfCount  + " " + t("badge_notfound").toLowerCase());
      if (dupCount) parts.push(dupCount + " " + t("badge_duplicates").toLowerCase());
      const msg = parts.join(", ");
      if (!warnEl) {
        warnEl = document.createElement("span");
        warnEl.id = "export-warn";
        warnEl.className = "export-warn";
        btnDownload.insertAdjacentElement("afterend", warnEl);
      }
      warnEl.textContent = "⚠ " + msg;
    } else {
      if (warnEl) warnEl.remove();
    }
  }

  function statusLabel(s) {
    if (hasEditableDetail(s)) return t("badge_review_all");
    const map = { parsed:"status_parsed", verified:"status_verified", updated:"status_updated",
      needs_review:"status_needs_review", needs_update:"status_needs_update", not_found:"status_not_found", error:"status_error", duplicate:"status_duplicate" };
    return t(map[s] || "status_parsed");
  }

  // ─── Card rendering ────────────────────────────────────────────────────
  function buildCardElement(r) {
    const card = document.createElement("div");
    const expanded = expandedCards.has(r.index);
    card.id = "card-" + r.index;
    const opened = openedCards.has(r.index);
    card.className = "entry-card status-" + r.status + (expanded ? " expanded" : " collapsed") + (opened ? " opened-once" : " unopened");
    card.dataset.status = r.status; card.dataset.index = r.index;
    if (r.duplicate_of) card.dataset.duplicate = "true";
    card.innerHTML = buildCardHTML(r);
    const header = card.querySelector(".entry-header");
    if (header) header.setAttribute("aria-expanded", expanded ? "true" : "false");
    applyFilterToCard(card, r);
    return card;
  }

  function hydrateExpandedCard(r) {
    if (expandedCards.has(r.index) && hasEditableDetail(r.status)) renderDetailInCard(r.index);
  }

  function renderEntryCard(r) {
    const card = buildCardElement(r);
    entryList.appendChild(card);
    hydrateExpandedCard(r);
    updateCardPositionMarkers();
  }

  function replaceCard(idx, opts = {}) {
    const old = document.getElementById("card-" + idx);
    const r = results[idx], card = buildCardElement(r);
    if (opts.appendToEnd) {
      cardOrder = cardOrder.filter(i => i !== idx);
      cardOrder.push(idx);
      if (old) old.remove();
      entryList.appendChild(card);
    } else if (old) {
      old.replaceWith(card);
    } else {
      if (!cardOrder.includes(idx)) cardOrder.push(idx);
      entryList.appendChild(card);
    }
    hydrateExpandedCard(r);
    updateCardPositionMarkers();
  }

  function applyFilterToCard(card, r) {
    card.classList.toggle("hidden", !filterMatchesResult(r, activeFilter));
  }

  function applyCurrentFilter() {
    $$(".entry-card").forEach(card => {
      const r = results[parseInt(card.dataset.index)];
      if (!r) return;
      card.classList.toggle("hidden", !filterMatchesResult(r, activeFilter));
    });
    updateCardPositionMarkers();
  }

  function buildDiffRow(d, idx, r) {
    const isEn = !(d.original || "").trim();
    const da = r.update_kind === "updated" ? "found" : "original";
    if (!fieldEdits[idx][d.field]) fieldEdits[idx][d.field] = { action: da, value: d.found || "" };
    const fe = fieldEdits[idx][d.field], ca = fe.action;
    const st = ca === "custom" ? (fe.value || "") : (d.found || "");
    const oa = encodeURIComponent(d.original || ""), fa = encodeURIComponent(d.found || "");
    const xSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    let origCell = !isEn
      ? '<button class="choice-pill pill-original ' + (ca === "original" ? "active" : "") + '" data-entry="' + idx + '" data-field="' + escAttr(d.field) + '" data-action="original" data-val="' + escAttr(d.original || "") + '">' + esc(d.original) + '</button>'
      : '<span class="empty-val">—</span>';
    let sugCell = isNeedsUpdateStatus(r.status)
      ? '<span class="choice-pill pill-suggested ' + (ca === "found" || ca === "custom" ? "active" : "") + ' ' + (ca === "remove" ? "removed" : "") + '" contenteditable="' + (ca === "remove" ? "false" : "true") + '" spellcheck="false" data-entry="' + idx + '" data-field="' + escAttr(d.field) + '" data-action="found" data-val="' + escAttr(d.found || "") + '">' + esc(st) + '</span>'
      : "";
    return '<tr class="diff-row" data-entry="' + idx + '" data-field="' + escAttr(d.field) + '" data-action="' + escAttr(ca) + '" data-enrichment="' + (isEn ? "1" : "") + '" data-found-val="' + escAttr(fa) + '" data-original-val="' + escAttr(oa) + '"><td class="field-name"><span class="field-name-pill">' + esc(d.field) + '</span></td><td class="val-col val-col-original">' + origCell + '</td><td class="val-col val-col-suggested">' + sugCell + '</td><td class="field-actions-mini"><button class="fa-btn-x ' + (ca === "remove" ? "active" : "") + '" title="' + (isEn ? "Don\'t add" : "Remove field") + '" data-entry="' + idx + '" data-field="' + escAttr(d.field) + '" data-action="remove" data-val="">' + xSvg + '</button></td></tr>';
  }

  function candidateSourceUrl(c) {
    const sourceUrl = String(c?._source_url || "").trim();
    if (/^https?:\/\//i.test(sourceUrl)) return sourceUrl;
    const source = String(c?._source || "").toLowerCase();
    const doi = c && c.doi ? B.normalizeDoi(c.doi) : "";
    if (source.includes("crossref") || source === "cr") {
      const title = B.stripLatex(c?.title || "").trim();
      return title ? "https://search.crossref.org/search/works?q=" + encodeURIComponent(title) + "&from_ui=yes" : "";
    }
    if ((source.includes("semantic_scholar") || source === "ss") && doi) return "https://api.semanticscholar.org/graph/v1/paper/DOI:" + encodeURIComponent(doi);
    if (source.includes("arxiv") && c?.url) return c.url;
    if (source.includes("zenodo") && c?.url && /zenodo\.org/i.test(c.url)) return c.url;
    const direct = [c?.url, c?.link].map(v => String(v || "").trim()).find(v => /^https?:\/\//i.test(v) && !/^https?:\/\/(?:dx\.)?doi\.org\//i.test(v));
    return direct || "";
  }

  function candidateApiMeta(c) {
    const venue = c.journal || c.booktitle || "";
    const doi = c.doi ? "DOI " + B.normalizeDoi(c.doi) : "";
    return [c.year, venue, c._source, doi].filter(Boolean).join(" | ");
  }

  function buildCandidatesHTML(r, idx) {
    if (!r.candidates || r.candidates.length === 0) return "";
    const ct = B.stripLatex(r.title || "");
    const openSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/><path d="M5 5h6"/><path d="M5 5v14h14v-6"/></svg>';
    const renderItem = (c, ci) => {
      const score = Math.round(B.titleSimilarity(ct, c.title || ""));
      const scoreClass = score >= 85 ? "score-high" : score >= 70 ? "score-mid" : "score-low";
      const isActive = ci === (r.selectedCandidateIdx || 0);
      const meta = candidateApiMeta(c);
      const selLabel = isActive ? '<span class="candidate-selected-label">' + t("selected") + '</span>' : "";
      const url = candidateSourceUrl(c);
      const link = url
        ? '<a class="candidate-open-link" href="' + escAttr(url) + '" target="_blank" rel="noopener" title="Open source record" aria-label="Open source record">' + openSvg + '</a>'
        : '<span class="candidate-open-link disabled" title="No source link" aria-label="No source link">' + openSvg + '</span>';
      return '<div class="candidate-row">' +
        '<button class="candidate-item' + (isActive ? " active" : "") + '" data-entry="' + idx + '" data-candidate="' + ci + '">' +
          '<span class="candidate-rank">#' + (ci + 1) + '</span>' +
          '<span class="candidate-body"><span class="candidate-title">' + esc(c.title || t("no_title")) + '</span><span class="candidate-meta">' + esc(meta) + '</span></span>' +
          '<span class="candidate-score ' + scoreClass + '">' + score + '%</span>' + selLabel +
        '</button>' + link +
      '</div>';
    };
    const top3 = r.candidates.slice(0, 3), rest = r.candidates.slice(3);
    let itemsHTML = top3.map((c, i) => renderItem(c, i)).join("");
    let moreHTML = "";
    if (rest.length) {
      const moreItems = rest.map((c, i) => renderItem(c, i + 3)).join("");
      moreHTML = '<button class="candidates-more-btn" data-entry="' + idx + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' + rest.length + ' ' + t("candidates_more") + '</button><div class="candidates-extra">' + moreItems + '</div>';
    }
    return '<div class="candidates-panel"><div class="candidates-header"><span class="candidates-title">' + t("candidates_title") + '</span><span class="candidates-count">' + r.candidates.length + '</span></div>' + itemsHTML + moreHTML + '</div>';
  }

  function buildCardHTML(r) {
    const idx = r.index, entry = parsedEntries[idx];
    if (!fieldEdits[idx]) fieldEdits[idx] = {};
    const editableDetail = hasEditableDetail(r.status);
    const candidateListHTML = editableDetail ? buildCandidatesHTML(r, idx) : "";

    let dupHTML = r.duplicate_of ? '<div class="duplicate-row">' + t("dup_of") + ' <strong>' + esc(r.duplicate_of) + '</strong></div>' : "";
    let revHTML = "", nfHTML = "", errHTML = "";
    if (r.update_kind === "needs_review" && r.found_title) revHTML = '<div class="review-hint">' + t("similarity") + ': <strong>' + esc(String(r.title_score)) + '%</strong> — <strong class="review-hint-match">' + esc(r.found_title) + '</strong></div>';
    if (r.status === "not_found") nfHTML = '<div class="not-found-hint">' + (r.title.trim() ? t("not_found_msg") : t("no_title_msg")) + '</div>';
    if (r.status === "error") { const diags = parseDiags.filter(d => d.entry_id === r.entry_id); errHTML = '<div class="error-hint">' + diags.map(d => esc(d.message)).join("<br>") + '</div>'; }

    const searchQuery = encodeURIComponent(B.stripLatex(r.title || ""));
    const searchLinksHTML = (r.title || "").trim()
      ? '<div class="search-links">' +
          '<a class="search-link" href="https://scholar.google.com/scholar?q=' + searchQuery + '" target="_blank" rel="noopener" title="Google Scholar"><span class="search-link-label">G</span></a>' +
          '<a class="search-link" href="https://www.semanticscholar.org/search?q=' + searchQuery + '" target="_blank" rel="noopener" title="Semantic Scholar"><span class="search-link-label">S2</span></a>' +
          '<a class="search-link" href="https://dblp.org/search?q=' + searchQuery + '" target="_blank" rel="noopener" title="DBLP"><span class="search-link-label">D</span></a>' +
          '<a class="search-link" href="https://zenodo.org/search?q=' + searchQuery + '" target="_blank" rel="noopener" title="Zenodo"><span class="search-link-label">Z</span></a>' +
        '</div>'
      : "";

    const collapseIcon = '<span class="entry-collapse-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
    const goodMatchIcon = r.status === "verified"
      ? '<span class="initial-match-icon" title="Good initial match" aria-label="Good initial match"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'
      : "";
    const positionHTML = '<span class="entry-list-position" data-entry-position="' + idx + '"></span>';
    const headerHTML = '<div class="entry-header" role="button" tabindex="0" aria-expanded="false" data-entry-toggle="' + idx + '"><div class="entry-header-main">' + collapseIcon + positionHTML + '<div class="entry-header-text"><div class="entry-title">' + esc(r.title || t("no_title")) + '</div><div class="entry-meta">' + goodMatchIcon + '<span>' + esc(r.entry_id) + ' &middot; ' + esc(r.entry_type) + '</span></div></div></div><div class="entry-header-aside">' + searchLinksHTML + '<div class="entry-tags">' + (r.duplicate_of ? '<span class="status-tag tag-duplicate">' + t("status_duplicate") + '</span>' : "") + '<span class="status-tag tag-' + (editableDetail ? "review" : escAttr(r.status)) + '">' + statusLabel(r.status) + '</span></div></div></div>';

    if (editableDetail) {
      // Candidates panel
      let candidatesHTML = "";
      if (r.candidates && r.candidates.length > 0) {
        const ct = B.stripLatex(r.title || "");
        const top3 = r.candidates.slice(0, 3), rest = r.candidates.slice(3);
        const renderItem = (c, ci) => {
          const score = Math.round(B.titleSimilarity(ct, c.title || ""));
          const scoreClass = score >= 85 ? "score-high" : score >= 70 ? "score-mid" : "score-low";
          const isActive = ci === (r.selectedCandidateIdx || 0);
          const src = c._source || "";
          const meta = [c.year, c.journal || c.booktitle, src].filter(Boolean).join(" · ");
          const selLabel = isActive ? '<span class="candidate-selected-label">' + t("selected") + '</span>' : "";
          return '<button class="candidate-item' + (isActive ? " active" : "") + '" data-entry="' + idx + '" data-candidate="' + ci + '"><span class="candidate-rank">#' + (ci+1) + '</span><span class="candidate-body"><span class="candidate-title">' + esc(c.title || t("no_title")) + '</span><span class="candidate-meta">' + esc(meta) + '</span></span><span class="candidate-score ' + scoreClass + '">' + score + '%</span>' + selLabel + '</button>';
        };
        let itemsHTML = top3.map((c, i) => renderItem(c, i)).join("");
        let moreHTML = "";
        if (rest.length) {
          const moreItems = rest.map((c, i) => renderItem(c, i + 3)).join("");
          moreHTML = '<button class="candidates-more-btn" data-entry="' + idx + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' + rest.length + ' ' + t("candidates_more") + '</button><div class="candidates-extra">' + moreItems + '</div>';
        }
        candidatesHTML = '<div class="candidates-panel"><div class="candidates-header"><span class="candidates-title">' + t("candidates_title") + '</span><span class="candidates-count">' + r.candidates.length + '</span></div>' + itemsHTML + moreHTML + '</div>';
      }
      const detailSlot = '<div class="entry-detail-slot" id="detail-slot-' + idx + '"></div>';
      return headerHTML + '<div class="entry-body">' + dupHTML + revHTML + candidateListHTML + detailSlot + '</div>';
    } else {
      // Parsed / Not Found / Duplicate / Error: read-only original bib
      const origBib = B.entriesToBib([entry]);
      const bibReadonly = '<pre class="bib-readonly">' + esc(origBib) + '</pre>';
      return headerHTML + '<div class="entry-body">' + dupHTML + errHTML + nfHTML + bibReadonly + '</div>';
    }
  }

  // ─── Four-view: render inside card ────────────────────────────────────
  function setCardExpanded(idx, expanded) {
    const card = document.getElementById("card-" + idx);
    const r = results[idx];
    if (!card || !r) return;
    if (expanded) expandedCards.add(idx);
    else expandedCards.delete(idx);
    if (expanded) openedCards.add(idx);
    card.classList.toggle("expanded", expanded);
    card.classList.toggle("collapsed", !expanded);
    card.classList.toggle("opened-once", openedCards.has(idx));
    card.classList.toggle("unopened", !openedCards.has(idx));
    const header = card.querySelector(".entry-header");
    if (header) header.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (expanded && hasEditableDetail(r.status)) renderDetailInCard(idx);
  }

  function shouldIgnoreHeaderToggle(target) {
    return !!target.closest("a, button, input, textarea, select, [contenteditable]");
  }

  document.addEventListener("click", e => {
    const header = e.target.closest(".entry-header");
    if (!header || shouldIgnoreHeaderToggle(e.target)) return;
    const idx = parseInt(header.dataset.entryToggle);
    if (isNaN(idx)) return;
    setCardExpanded(idx, !expandedCards.has(idx));
  });

  document.addEventListener("keydown", e => {
    const header = e.target.closest(".entry-header");
    if (!header || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const idx = parseInt(header.dataset.entryToggle);
    if (isNaN(idx)) return;
    setCardExpanded(idx, !expandedCards.has(idx));
  });

  function buildFourViewHTML(idx) {
    const r = results[idx];
    const sourceLabel = r && r.found && r.found._source ? ' <span class="fv-source-badge">' + esc(r.found._source.toUpperCase()) + '</span>' : "";
    const refreshSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></svg>';
    const adoptBtn = '<button class="btn-adopt-found" data-entry="' + idx + '" title="' + esc(t("adopt_found")) + '">' + refreshSvg + '</button>';
    const iconDiff = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';
    return (
      '<div class="fv-field-table-wrap"><table class="fv-field-table" id="fv-table-' + idx + '">' +
        '<thead><tr>' +
          '<th class="fv-col-field">Field</th>' +
          '<th class="fv-col-orig">' + esc(t("view_original")) + '</th>' +
          '<th class="fv-col-found">' + esc(t("view_found")) + sourceLabel + '</th>' +
          '<th class="fv-col-edit">' + esc(t("view_edit")) + '</th>' +
          '<th class="fv-col-act">' + adoptBtn + '</th>' +
        '</tr></thead>' +
        '<tbody id="fv-tbody-' + idx + '"></tbody>' +
      '</table></div>' +
      '<div class="fv-diff-wrap">' +
        '<div class="fv-diff-header">' + iconDiff + '<span>' + esc(t("view_diff")) + '</span></div>' +
        '<pre class="fv-diff-body" id="fv-diff-' + idx + '"></pre>' +
      '</div>'
    );
  }

  function renderDetailInCard(idx) {
    const slot = document.getElementById("detail-slot-" + idx);
    if (!slot) return;
    const r = results[idx], entry = parsedEntries[idx];
    if (!r || !entry) return;

    if (!slot.querySelector(".detail-panel")) {
      const panel = document.createElement("div");
      panel.className = "detail-panel";
      panel.innerHTML = buildFourViewHTML(idx);
      slot.appendChild(panel);
    }

    // Determine all fields to show: title + compared fields + any extra fields present in entry or found
    const ALL_FIELDS = ["title"].concat(B.COMPARED_FIELDS);
    const diffFieldSet = new Set((r.field_diffs || []).map(d => d.field));
    const foundEntry = r.found || {};
    const extraFields = Object.keys({ ...entry, ...foundEntry }).filter(f =>
      !ALL_FIELDS.includes(f) && !["ID","ENTRYTYPE"].includes(f) && !f.startsWith("_") && (((entry[f] || "").toString().trim()) || ((foundEntry[f] || "").toString().trim()))
    );
    const fields = ALL_FIELDS.concat(extraFields.filter(f => !ALL_FIELDS.includes(f)));

    // Initialise edits from the original entry; adopting found values is explicit.
    for (const f of fields) {
      if (!fieldEdits[idx][f]) {
        const foundVal = (foundEntry[f] || "").toString();
        const origVal  = (entry[f]   || "").toString();
        const sameContent = B.fieldValuesEquivalent(f, origVal, foundVal);
        const action = "original";
        if (diffFieldSet.has(f)) {
          const d = r.field_diffs.find(x => x.field === f);
          fieldEdits[idx][f] = { action, value: action === "original" ? origVal : (foundVal || origVal) };
          if (d) fieldEdits[idx][f].foundVal = d.found || "";
        } else {
          fieldEdits[idx][f] = { action: "original", value: origVal };
        }
      }
    }

    populateFvTable(idx, fields, entry, foundEntry, r);
    refreshDetailDiff(idx);
  }

  function populateFvTable(idx, fields, entry, foundEntry, r) {
    const tbody = document.getElementById("fv-tbody-" + idx);
    if (!tbody) return;
    tbody.innerHTML = "";
    const xSvg = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const diffFieldSet = new Set((r.field_diffs || []).map(d => d.field));

    for (const f of fields) {
      const origVal  = (entry[f]      || "").toString();
      const foundVal = (foundEntry[f] || "").toString();
      const fe       = fieldEdits[idx][f] || { action: "original", value: origVal };
      const sameContent = B.fieldValuesEquivalent(f, origVal, foundVal);
      const hasDiff  = !sameContent && (diffFieldSet.has(f) || (origVal !== foundVal && (origVal || foundVal)));
      const isNew    = !origVal && foundVal;   // enrichment: field only in found

      const tr = document.createElement("tr");
      tr.className = "fv-row" + (hasDiff ? " fv-row-diff" : "");
      tr.dataset.entry = idx;
      tr.dataset.field = f;

      // Field name cell
      const tdField = document.createElement("td");
      tdField.className = "fv-col-field";
      tdField.innerHTML = '<span class="fv-field-name">' + esc(f) + (isNew ? ' <span class="fv-badge-new">+</span>' : "") + '</span>';

      // Original cell — clickable to restore that field's original value into edit
      const tdOrig = document.createElement("td");
      tdOrig.className = "fv-col-orig";
      tdOrig.innerHTML = origVal
        ? '<button class="fv-orig-cell' + (hasDiff && !isNew ? " fv-val-changed" : "") + '" data-entry="' + idx + '" data-field="' + escAttr(f) + '" data-val="' + escAttr(origVal) + '" title="Use original value">' + esc(origVal) + '</button>'
        : '<span class="fv-cell-empty">—</span>';

      // Found cell (clickable to adopt into edit)
      const tdFound = document.createElement("td");
      tdFound.className = "fv-col-found";
      if (foundVal) {
        tdFound.innerHTML = '<button class="fv-adopt-cell' + (hasDiff ? " fv-val-found-diff" : "") + '" data-entry="' + idx + '" data-field="' + escAttr(f) + '" data-val="' + escAttr(foundVal) + '" title="Use this value">' + esc(foundVal) + '</button>';
      } else {
        tdFound.innerHTML = '<span class="fv-cell-empty">—</span>';
      }

      // Edit cell (contenteditable)
      const editVal = fe.action === "custom" && fe.value === "" ? "" : (fe.action === "found" ? foundVal : (fe.action === "original" ? origVal : fe.value));
      const isEmpty = fe.action === "custom" && fe.value === "";
      const tdEdit = document.createElement("td");
      tdEdit.className = "fv-col-edit";
      tdEdit.innerHTML = '<span class="fv-edit-cell' + (isEmpty ? " fv-cleared" : "") + '" contenteditable="true" spellcheck="false" data-entry="' + idx + '" data-field="' + escAttr(f) + '">' + esc(editVal) + '</span>';

      // Actions cell — clear button only
      const tdAct = document.createElement("td");
      tdAct.className = "fv-col-act";
      tdAct.innerHTML = '<button class="fv-btn-remove" data-entry="' + idx + '" data-field="' + escAttr(f) + '" title="' + esc(t("clear_field")) + '">' + xSvg + '</button>';

      tr.append(tdField, tdOrig, tdFound, tdEdit, tdAct);
      tbody.appendChild(tr);
    }
  }

  function refreshFvTable(idx) {
    const r = results[idx], entry = parsedEntries[idx];
    if (!r || !entry) return;
    const ALL_FIELDS = ["title"].concat(B.COMPARED_FIELDS);
    const foundEntry = r.found || {};
    const extraFields = Object.keys({ ...entry, ...foundEntry }).filter(f =>
      !ALL_FIELDS.includes(f) && !["ID","ENTRYTYPE"].includes(f) && !f.startsWith("_") && (((entry[f] || "").toString().trim()) || ((foundEntry[f] || "").toString().trim()))
    );
    const fields = ALL_FIELDS.concat(extraFields.filter(f => !ALL_FIELDS.includes(f)));
    populateFvTable(idx, fields, entry, foundEntry, r);
  }

  function closeDetailInCard(idx) {
    const slot = document.getElementById("detail-slot-" + idx);
    if (slot) slot.innerHTML = "";
    if (currentDetailIdx === idx) currentDetailIdx = -1;
  }

  function publicEntryFields(entry) {
    return Object.keys(entry || {}).filter(f => f !== "ID" && f !== "ENTRYTYPE" && !f.startsWith("_"));
  }

  // Close button inside four-view (event delegation)
  document.addEventListener("click", e => {
    const btn = e.target.closest(".btn-close-detail");
    if (!btn) return;
    const idx = parseInt(btn.dataset.entry);
    if (!isNaN(idx)) closeDetailInCard(idx);
  });

  // Adopt found button (header — set all fields to found)
  document.addEventListener("click", e => {
    const btn = e.target.closest(".btn-adopt-found");
    if (!btn) return;
    const idx = parseInt(btn.dataset.entry);
    if (isNaN(idx)) return;
    const r = results[idx];
    if (!r || !r.found) return;
    const foundEntry = r.found;
    const fields = new Set(publicEntryFields(parsedEntries[idx]).concat(publicEntryFields(foundEntry)));
    fields.forEach(f => {
      const foundVal = Object.prototype.hasOwnProperty.call(foundEntry, f) ? (foundEntry[f] || "").toString() : "";
      fieldEdits[idx][f] = { action: "found", value: foundVal };
    });
    refreshFvTable(idx);
    refreshDetailDiff(idx);
  });

  // Click original-cell value → restore that single field into edit
  document.addEventListener("click", e => {
    const btn = e.target.closest(".fv-orig-cell");
    if (!btn) return;
    const idx = parseInt(btn.dataset.entry), field = btn.dataset.field, val = btn.dataset.val;
    if (isNaN(idx)) return;
    if (!fieldEdits[idx]) fieldEdits[idx] = {};
    fieldEdits[idx][field] = { action: "original", value: val };
    const row = btn.closest(".fv-row");
    const editCell = row?.querySelector(".fv-edit-cell");
    if (editCell) { editCell.textContent = val; editCell.classList.remove("fv-cleared"); }
    flashRow(row);
    refreshDetailDiff(idx);
  });

  // Click found-cell value → adopt that single field into edit
  document.addEventListener("click", e => {
    const btn = e.target.closest(".fv-adopt-cell");
    if (!btn) return;
    const idx = parseInt(btn.dataset.entry), field = btn.dataset.field, val = btn.dataset.val;
    if (isNaN(idx)) return;
    if (!fieldEdits[idx]) fieldEdits[idx] = {};
    fieldEdits[idx][field] = { action: "found", value: val };
    const row = btn.closest(".fv-row");
    const editCell = row?.querySelector(".fv-edit-cell");
    if (editCell) { editCell.textContent = val; editCell.classList.remove("fv-cleared"); }
    const removeBtn = row?.querySelector(".fv-btn-remove");
    if (removeBtn) removeBtn.classList.remove("active");
    flashRow(row);
    refreshDetailDiff(idx);
  });

  // Edit-cell input → custom value
  document.addEventListener("input", e => {
    const cell = e.target.closest(".fv-edit-cell[contenteditable]");
    if (!cell) return;
    const idx = parseInt(cell.dataset.entry), field = cell.dataset.field;
    if (!fieldEdits[idx]) fieldEdits[idx] = {};
    fieldEdits[idx][field] = { action: "custom", value: cell.textContent };
    cell.classList.toggle("fv-cleared", cell.textContent === "");
    refreshDetailDiff(idx);
  });

  // Clear field button — empties the edit cell only
  document.addEventListener("click", e => {
    const btn = e.target.closest(".fv-btn-remove");
    if (!btn) return;
    const idx = parseInt(btn.dataset.entry), field = btn.dataset.field;
    if (isNaN(idx)) return;
    if (!fieldEdits[idx]) fieldEdits[idx] = {};
    fieldEdits[idx][field] = { action: "custom", value: "" };
    const row = btn.closest(".fv-row");
    const editCell = row?.querySelector(".fv-edit-cell");
    if (editCell) { editCell.textContent = ""; editCell.classList.add("fv-cleared"); }
    flashRow(row);
    refreshDetailDiff(idx);
  });

  function buildEditEntry(idx, entry) {
    const editEntry = { ...entry };
    const edits = fieldEdits[idx] || {};
    for (const [f, fe] of Object.entries(edits)) {
      if (!fe) continue;
      if (fe.action === "found" || fe.action === "custom") { if (fe.value) editEntry[f] = fe.value; else delete editEntry[f]; }
    }
    return editEntry;
  }

  function renderDiffText(oldBib, newBib) {
    const oldL = oldBib.split("\n"), newL = newBib.split("\n");
    const ops = diffLines(oldL, newL);
    return ops.map(o => {
      const cls = o.type === "add" ? "diff-add" : o.type === "del" ? "diff-del" : "diff-ctx";
      return '<span class="diff-line ' + cls + '">' + esc(o.text) + '</span>';
    }).join("");
  }

  function refreshDetailDiff(idx) {
    const entry = parsedEntries[idx];
    if (!entry) return;
    const origBib = B.entriesToBib([entry]);
    const editBib = B.entriesToBib([buildEditEntry(idx, entry)]);
    const elDiff = document.getElementById("fv-diff-" + idx);
    if (elDiff) elDiff.innerHTML = renderDiffText(origBib, editBib);
  }

  function flashRow(row) { if (!row) return; row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); }

  // ─── Candidates: more/less toggle ─────────────────────────────────────
  document.addEventListener("click", e => {
    const btn = e.target.closest(".candidates-more-btn");
    if (!btn) return;
    const idx = parseInt(btn.dataset.entry);
    const extra = btn.nextElementSibling;
    if (!extra) return;
    const isExpanded = extra.classList.toggle("visible");
    btn.classList.toggle("expanded", isExpanded);
    const rest = (results[idx]?.candidates || []).slice(3).length;
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' + rest + ' ' + (isExpanded ? t("candidates_less") : t("candidates_more"));
  });

  // ─── Candidates: click to switch ──────────────────────────────────────
  document.addEventListener("click", e => {
    const btn = e.target.closest(".candidate-item");
    if (!btn) return;
    const idx = parseInt(btn.dataset.entry), ci = parseInt(btn.dataset.candidate);
    const r = results[idx];
    if (!r || !r.candidates || !r.candidates[ci]) return;
    const displayStatus = r.status;
    r.selectedCandidateIdx = ci;
    fieldEdits[idx] = {};
    applyCandidate(r, parsedEntries[idx], r.candidates[ci]);
    if (hasEditableDetail(displayStatus)) r.status = displayStatus;
    replaceCard(idx);
    updateSummary();
    rebuildToc();
  });

  // ─── Summary ───────────────────────────────────────────────────────────
  function updateSummary() {
    const c = { parsed: 0, review: 0, not_found: 0, error: 0 };
    let dupes = 0;
    results.forEach(r => {
      if (hasEditableDetail(r.status)) c.review++;
      else c[r.status] = (c[r.status] || 0) + 1;
      if (r.duplicate_of) dupes++;
    });
    const b = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
    b(".badge-parsed",     t("badge_parsed")     + ": " + c.parsed);
    b(".badge-review",     t("badge_review_all") + ": " + c.review);
    b(".badge-notfound",   t("badge_notfound")   + ": " + c.not_found);
    b(".badge-duplicates", t("badge_duplicates") + ": " + dupes);
    b(".badge-error",      t("badge_error")      + ": " + c.error);
    $$(".summary-badge").forEach(b => b.classList.toggle("active", activeFilter === "all" || b.dataset.filter === activeFilter));
  }

  // ─── LCS diff ──────────────────────────────────────────────────────────
  function diffLines(oldL, newL) {
    const m = oldL.length, n = newL.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = oldL[i-1] === newL[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
    const result = []; let i = m, j = n;
    while (i > 0 || j > 0) { if (i > 0 && j > 0 && oldL[i-1] === newL[j-1]) { result.push({ type: "ctx", text: newL[j-1] }); i--; j--; } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { result.push({ type: "add", text: newL[j-1] }); j--; } else { result.push({ type: "del", text: oldL[i-1] }); i--; } }
    return result.reverse();
  }

  // ─── Filtering ─────────────────────────────────────────────────────────
  document.addEventListener("click", e => {
    const badge = e.target.closest(".summary-badge"); if (!badge) return;
    const filter = badge.dataset.filter;
    activeFilter = activeFilter === filter ? "all" : filter;
    $$(".summary-badge").forEach(b => b.classList.toggle("active", activeFilter === "all" || b.dataset.filter === activeFilter));
    applyCurrentFilter();
    rebuildToc();
  });

  // ─── Settings popover ──────────────────────────────────────────────────
  const settingsToggle = $("#settings-toggle"), settingsPopover = $("#settings-popover");
  const floatingHelp = $("#floating-help");
  settingsToggle.addEventListener("click", e => { e.stopPropagation(); if (floatingHelp) floatingHelp.open = false; const isOpen = settingsPopover.classList.toggle("open"); settingsToggle.classList.toggle("active", isOpen); });
  if (floatingHelp) floatingHelp.addEventListener("toggle", () => {
    if (!floatingHelp.open) return;
    settingsPopover.classList.remove("open");
    settingsToggle.classList.remove("active");
  });
  document.addEventListener("click", e => { if (!settingsPopover.contains(e.target) && e.target !== settingsToggle) { settingsPopover.classList.remove("open"); settingsToggle.classList.remove("active"); } });

  // ─── Activity log toggle ───────────────────────────────────────────────
  const logToggle = $("#activity-log-toggle");
  if (logToggle) logToggle.addEventListener("click", () => { const al = $("#activity-log"); if (al) al.classList.toggle("expanded"); logToggle.setAttribute("aria-expanded", al?.classList.contains("expanded") ? "true" : "false"); });
  const logClear = $("#activity-log-clear");
  if (logClear) logClear.addEventListener("click", () => { if (activityLogLines) activityLogLines.innerHTML = ""; logCount = 0; if (activityLogCount) activityLogCount.textContent = "0 " + t("log_events"); });

  // ─── Download ──────────────────────────────────────────────────────────
  function buildExportBib() {
    return B.entriesToBib(parsedEntries.slice(0, results.length).map((entry, i) => {
      const r = results[i]; if (!r) return { ...entry };
      return buildEditEntry(i, entry);
    }).filter(Boolean));
  }
  btnDownload.addEventListener("click", () => {
    const bibContent = buildExportBib();
    const blob = new Blob([bibContent], { type: "application/x-bibtex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "verified_refs.bib"; a.click();
    URL.revokeObjectURL(url);
  });

  // ─── Helpers ───────────────────────────────────────────────────────────
  function esc(str) { const d = document.createElement("div"); d.textContent = str; return d.innerHTML; }
  function escAttr(str) {
    return String(str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ─── Init ──────────────────────────────────────────────────────────────
  _appReady = true;
  applyLang();
})();
