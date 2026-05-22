<p align="center">
  <img src="assets/logo.png" alt="BibSentry logo" width="160" />
</p>

# BibSentry

BibSentry is a browser-based BibTeX review tool. It parses `.bib` files locally, searches public metadata sources, ranks candidate matches, shows field-level differences, and exports a cleaned `.bib` file.

[Live app](https://lartpang.github.io/BibSentry) | [MIT License](LICENSE) | [Notice](NOTICE)

## What It Does

- Parses BibTeX in your browser.
- Expands common macros such as `@string` and month names.
- Checks entries against selected public sources.
- Ranks multiple candidates instead of silently choosing one.
- Lets you review, edit, accept, clear, or keep fields before export.
- Keeps parsing, editing, and export local to the page.

## Lookup Flow

BibSentry uses a conservative lookup order:

1. Non-publication entries, such as software or web pages, are checked by URL validity.
2. Entries that already mention Zenodo are searched in Zenodo first.
3. Regular publications are searched through the selected Tier 1 sources:
   CrossRef, Semantic Scholar, and DBLP.
4. Published journal or conference records are preferred over preprints when the match is credible.
5. If no published record is found, OpenReview is checked for accepted or published venue metadata.
6. If needed, arXiv is used as the final fallback.

Zenodo and arXiv are always enabled as fallback sources. CrossRef, Semantic Scholar, DBLP, and OpenReview can be selected in the settings panel.

## Basic Use

1. Open the [live app](https://lartpang.github.io/BibSentry).
2. Upload a `.bib` file or paste BibTeX text.
3. Open the settings panel to choose sources, ignored fields, and an optional Semantic Scholar API key.
4. Click `Start verification`.
5. Review matched entries, inspect candidates, and edit fields as needed.
6. Click `Download Corrected .bib`.

## Review UI

After parsing, entries are shown immediately. During verification, matched entries move into a unified `Review` workflow.

- A fixed marker indicates entries with a strong initial match.
- Candidate lists show the source, title, score, metadata, and a source-page button.
- Each matched entry has four views:
  - `Original`: values from your BibTeX.
  - `Found`: values from the selected candidate.
  - `Edit`: editable export values.
  - `Diff`: before/after BibTeX comparison.
- `Not Found`, `Duplicate`, and `Error` entries remain visible and can be filtered.

Ignored fields are excluded from consistency checks. For example, adding `note`, `url`, or `urldate` lets BibSentry ignore those fields while still showing candidate metadata.

## Privacy

BibSentry has no project backend. Your full `.bib` file is not uploaded to a BibSentry server.

Online lookup requests go directly from your browser to the enabled public APIs. These requests may include titles, DOI values, arXiv IDs, or URLs needed for lookup.

Semantic Scholar API keys stay in page memory by default. If `Remember on this browser` is enabled, the key is stored in `localStorage` and is only sent to Semantic Scholar.

## Limits

- Public API metadata can be incomplete, inconsistent, or delayed.
- Title matching is fuzzy and should still be reviewed for ambiguous papers.
- DOI and arXiv lookup are used as supporting signals, not as a guarantee of correctness.
- Large `.bib` files may take time because public APIs rate-limit requests.

## Local Development

```bash
git clone https://github.com/lartpang/BibSentry.git
cd BibSentry
npx serve docs
```

Run checks:

```bash
node tests/test_lib.js
node --check docs/lib.js
node --check docs/app-core.js
node --check docs/app.js
```

## Project Layout

| Path                | Purpose                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| `docs/index.html`   | Static page markup and floating controls.                                  |
| `docs/style.css`    | App layout, cards, editor, toolbar, and navigation styles.                 |
| `docs/app-core.js`  | Source lookup, fallback flow, rate limiting, and API-key callback.         |
| `docs/app.js`       | Parsing workflow, verification queue, cards, editing, filters, and export. |
| `docs/lib.js`       | Parsing, normalization, comparison, ranking, and serialization.            |
| `tests/test_lib.js` | Node tests for pure logic.                                                 |

## Acknowledgement

BibSentry builds on the original [merfanian/Bibtex-Verifier](https://github.com/merfanian/Bibtex-Verifier). That project provided the browser-based verification foundation and inspired this work. The original MIT license and attribution are preserved in [LICENSE](LICENSE) and [NOTICE](NOTICE).

## License

[MIT](LICENSE)
