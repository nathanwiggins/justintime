# Just-In-Time

A lightweight, client-side budget justification generator and verifier for research administrators. No backend, no build step — hosted on GitHub Pages.

## Features

### Verifier
- Upload a budget justification (`.docx`) and its spreadsheet (`.csv`/`.xls`/`.xlsx`) to catch mismatches before you submit.
- AI labels every dollar value, matches it against the spreadsheet, and groups discrepancies by root cause.
- A guided chat walks you through each finding — confirm it, explain it away, click "Ignore Issue" to skip it, or click "Flag Issue" to mark it as a confirmed issue without discussion.
- The justification and spreadsheet are shown side-by-side with the chat, with flagged values highlighted and auto-tracked as you go.
- Ends with a plain-language summary and a downloadable marked-up copy of the justification with flagged values highlighted.
- "Try it out!" at the end of the walkthrough launches a guided, sample-document run-through of the whole Verifier flow, with on-screen arrows pointing to what to click next. Exit it at any time.

### Generator
- Upload a budget spreadsheet and project summary to get a formatted `.docx` justification back.
- Choose a Grant Template Type — National Science Foundation or General grants.gov, each with its own section layout.
- Institutional Profiles store your fringe/F&A boilerplate so the AI weaves institution-specific language into the narrative.
- Before extracting each section, the AI first suggests which items belong in it based on the budget spreadsheet, then those suggestions steer the real extraction toward what's actually relevant — visible in each section's "Details" log. Skipped for Fringe Benefits and Indirect Costs.
- Each section is generated in two passes — verified data extraction, then narrative writing — with the numbers automatically reconciled so the writing pass can't quietly change a figure.
- Every line item's total is recalculated from its own year-by-year breakdown rather than trusted as extracted, so a multi-year item (e.g. a recurring trip) can't be undercounted — unless no yearly breakdown was returned for it, in which case the extracted total is kept as-is and flagged rather than zeroed out.
- Travel line items break down into itemized cost components (Airfare, Mileage, Lodging, Per Diem, Registration, Other) with a computed subtotal, when the budget spreadsheet itemizes them.
- Items in the generic "Other" category are automatically checked against every other budget category and dropped if they appear to be the same expense counted twice.
- Template Mode produces a structured draft with placeholder text instead of full AI-written narrative.
- Categories and sub-sections with no budgeted items skip their "total request" sentence and headers instead of showing a $0 placeholder.

### Shared
- Drag-and-drop uploads, an animated scan → label → match → audit → summarize progress sequence (full technical log available via "Expand Analysis Details"), and a "How It Works" walkthrough for first-time users.
- The Generator tab is the leftmost tab in the nav bar.
- API keys are stored only in your browser's `localStorage` — a warning reminds you to check your key's data-sharing terms before use.

## Tech Stack

| Concern | Library |
|---|---|
| Spreadsheet parsing | [SheetJS](https://sheetjs.com/) |
| Word document parsing | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) |
| AI generation | [Gemini API](https://ai.google.dev/) (structured JSON output) |
| Word document generation | [docx](https://github.com/dolanmiu/docx) (built programmatically) |
| Verifier progress animation | [anime.js](https://animejs.com/) (CDN) |
| Settings & review-chat persistence | Browser `localStorage` |

## File Structure

```
justintime/
├── index.html              # SPA shell
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # Boot, tab routing
│   ├── settings.js         # Settings tab + localStorage CRUD
│   ├── generator.js        # Generator workflow orchestration
│   ├── parser.js           # SheetJS parsing + source-of-truth extraction
│   ├── api.js              # Universal API adapter: Gemini direct (standalone) or Vandalizer proxy (DGX-hosted)
│   ├── schemas.js          # Full JSON schemas per template type + VerifierSchemas
│   ├── sections.js         # Section registry: ordered section definitions per template
│   ├── verifier.js         # Portable two-step verification core: Verifier.run(text, csv, key)
│   ├── verifier-tab.js     # Verifier tab UI: file handling, orchestration, results rendering
│   ├── verify-anim.js      # Animated scan/label/match/audit/summarize progress sequence
│   ├── verifier-chat.js    # Chat-driven findings review, persists/resumes via localStorage
│   ├── highlighter.js      # DOCX markup: injects <w:highlight> into flagged runs via JSZip
│   ├── doc-preview.js      # Live in-browser justification preview
│   ├── sheet-preview.js    # Live in-browser spreadsheet preview
│   ├── document.js         # docx output + download trigger
│   └── try-it-tutorial.js  # Guided "Try it out!" sample-document walkthrough
├── templates/
│   ├── nsf.txt             # Reference: NSF section layout and field definitions
│   └── general.txt         # Reference: General grants.gov section layout and field definitions
└── examples/                # Sample justification + spreadsheet used by "Try it out!"
```

## Getting Started: Obtaining a Gemini API Key

> **DGX / Vandalizer deployments:** AI calls route through the `/api/apps/generate` proxy automatically. No Gemini API key needed. If your Vandalizer session expires mid-use, it's refreshed automatically and the request retries — no reload needed.

Just-In-Time uses the Gemini API when running standalone. A free key is available through Google AI Studio — no billing required for standard use.

**Get a key:**
1. Go to [aistudio.google.com](https://aistudio.google.com/) and sign in with any Google account.
2. Click **Get API key** in the sidebar, then **Create API key**.
3. Copy the generated string.

> **Security note:** Treat this key like a password. Never commit it to a public repository.

**Configure it in Just-In-Time:**
- **UI (recommended):** Settings tab → paste into **Gemini API Key** → **Save API Key**. Stored in `localStorage`, never leaves your device.
- **Environment variable** (local backend use): add `GEMINI_API_KEY=your_actual_api_key_here` to a `.env` file in the project root.

## Local Development

No build step. Open `index.html` directly, or serve the directory:

```bash
npx serve .
```

## Deployment

Push to `main` — GitHub Pages serves `index.html` from the repository root automatically.

## Usage

### Verifying a budget justification
1. Go to the **Verifier** tab.
2. Upload a budget justification `.docx` and its spreadsheet.
3. Click **Verify Budget**.
4. Work through the chat that opens for each flagged finding — confirm, dismiss, or ignore it.
5. Review the summary and download the marked-up document.

Behind the scenes: values are labeled, matched against the spreadsheet, audited, and grouped by root cause before the chat opens. On DGX/Vandalizer deployments, large documents are processed in batches of 25 automatically; direct Gemini API calls batch at 50+ values to avoid truncation on very large documents.

### Generating a budget justification
1. Go to the **Settings** tab, enter and save your Gemini API key.
2. Create at least one Institutional Profile with your fringe/F&A boilerplate.
3. Go to the **Generator** tab.
4. Select a profile, upload your budget file and project summary.
5. Click **Generate Justification** — a `.docx` downloads automatically.
