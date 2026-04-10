# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EUNOIA.kz is a static website for a Kazakhstan-based fintech company offering instant payouts (B2B2C) via Kazakhstan's SMP (instant payment system). The site is hosted on GitHub Pages with a custom domain (`eunoia.kz`).

The site is currently in **maintenance mode** — the live `index.html` shows a maintenance page. The full production site is preserved in `index-temp.html`.

## Deployment

Pushing to `main` auto-deploys via GitHub Pages (repo: `aqniyet/eunoia.kz`). There is no build step — HTML files are served as-is.

**Critical:** Root `index.html` and `eunoia.kz/index.html` must stay in sync — they are identical copies. When updating one, copy the same content to the other.

## Key Files

- **`index.html`** + **`eunoia.kz/index.html`** — live maintenance pages (must be kept identical)
- **`index-temp.html`** — full production landing page with SEO, structured data, analytics
- **`eunoia.kz/one-pager.html`** — A4 partnership proposal (print-ready, uses Inter font and light theme — distinct from the main site's design)
- **`CNAME`** files — GitHub Pages custom domain config

## Key Technical Details

- **No build system** — all HTML/CSS/JS is hand-written, no frameworks or bundlers
- **Analytics**: Google Analytics `G-ZNMX4CYVY7`
- **Main site design system**: CSS custom properties in `:root` — dark theme with `--accent-green: #00ff88`, `--accent-purple: #a855f7`, Outfit font family
- **Bilingual**: Russian (default) and English, toggled via JS `switchLang()` function using `.lang-content.active` class
- **To restore the site from maintenance**: replace `index.html` (both root and `eunoia.kz/`) with the contents of `index-temp.html`

## PDF Generation

```bash
pip install weasyprint
python generate_pdf.py
```

Or print `eunoia.kz/one-pager.html` from a browser with "Save as PDF", margins set to None, background graphics enabled.
