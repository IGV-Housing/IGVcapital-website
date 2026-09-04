# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The igvcapital.com marketing site: five static, self-contained HTML pages, no
build step, no framework, no bundler. Each page is a full standalone document
with its CSS and JS inlined (Webflow-export style) — there is no shared
header/footer partial and no templating layer. Editing nav, footer, or any
cross-page markup means editing all five files by hand.

Pages: `public/index.html`, `public/contact/index.html`, `public/ltd/index.html`,
`public/housing-accelerator-program/index.html`, `public/terms/index.html`.

## Commands

There is no `package.json`, build tool, linter, or test suite in this repo.
Files are served exactly as authored.

- **Deploy**: `git push` to `main`. Cloudflare Workers Builds is Git-connected
  to this repo and auto-deploys on push (see `wrangler.jsonc` — the Worker is
  `igvcapital-website`, serving `./public` as static assets). There is no
  manual `wrangler deploy` step and no GitHub Actions workflow driving this.
- **Verify a change**: no automated tests — check manually in a browser
  against the deployed preview/production URL after pushing.

## Deployment architecture (important — diverges from a plain static host)

This is a Cloudflare **Worker with static assets**, not Cloudflare Pages.
That distinction matters:

- The live URL pattern is `<worker-name>.<account-subdomain>.workers.dev`,
  not `*.pages.dev`.
- Static asset serving is **case-sensitive**. An internal link to `/LTD`
  will 404 against the real `/ltd/` page — every internal href must match
  the on-disk path casing exactly. This has been a recurring source of
  broken links; when adding or editing internal links, verify the casing
  against the actual directory name under `public/`.
- All asset references (images, favicons) must be **root-absolute**
  (`/assets/img/foo.png`), never relative (`images/foo.png` or
  `../assets/...`). A relative path resolves differently depending on the
  page's nesting depth and will silently 404 on any page that isn't at the
  root. This has already caused broken favicons/images across every nested
  page once; treat any new relative asset path as a bug.
- The site was previously three separate per-page Cloudflare Pages projects
  (`igv-capital-ltd.pages.dev`, `igv-capital-hap.pages.dev`) later
  consolidated into this single repo/Worker. Watch for leftover absolute
  URLs pointing at those old `*.pages.dev` domains when touching the `ltd`
  or `housing-accelerator-program` pages — they're dead now.

## Environments

| | Local | Staging | Production |
|---|---|---|---|
| Branch | `feature/*` | `staging` | `main` |
| URL | `localhost:5500` | `staging.igvcapital.com` | `igvcapital.com` |

`public/assets/js/config.js` computes a `window.IGV` object (HubSpot form ID,
reCAPTCHA key, a staging-only banner) keyed off `location.hostname`, treating
anything that isn't `igvcapital.com`/`www.igvcapital.com` as staging.
**This file is not currently `<script src>`-included on any page** — it's
effectively dead code right now. Don't assume `window.IGV` is populated
anywhere; check whether a page actually loads `config.js` before relying on
it, and if you wire it in, be aware nothing currently depends on it.

The GA4 tag (`G-5WHbW3JCJ`, one `<script>` block inlined near the top of
`<head>` on all five pages) does its own hostname check rather than using
`window.IGV`, for the same reason — it fires `gtag('config', ...)` only on
`igvcapital.com`/`www.igvcapital.com` so staging/localhost traffic doesn't
land in the live property.

## Contact form (`public/contact/index.html`)

The form does **not** use `window.IGV` — it hardcodes its own config inline
near the bottom of the file:
- Posts to `https://igvcapital-contact-verify.igvhousing.workers.dev`
  (the `igvcapital-contact-verify` Worker) — same endpoint regardless of
  environment; there is no staging/production split actually wired up here
  despite `config.js` and `README.md` describing one.
- Uses **reCAPTCHA Enterprise** (`recaptcha/enterprise.js`), not the v2
  checkbox widget `config.js` was written for.
- The `igvcapital-contact-verify` Worker's source is not in this repo (see
  `workers/`, currently empty) — it's deployed separately.

## Brand

| Token | Value |
|---|---|
| Evergreen | `#1A4848` |
| Magenta | `#952944` |
| Off White | `#FFFDF3` |

Evergreen is `#1A4848` — the brand guide PDF lists `#194823`, which visibly
mismatches the logo artwork and is superseded.

Bitter (serif) for headings/quotes/body copy, Montserrat for UI chrome and
labels/buttons. This Bitter+Montserrat pairing is specific to IGV Capital —
other IGV properties are Montserrat-only.

## `workers/`

Currently empty. `README.md` describes `igvcapital-router` and
`igvcapital-contact-verify` as living here, but neither's source is actually
checked in — the router was disabled during the Cloudflare cutover and
contact-verify is deployed from elsewhere. Don't assume code you can't find
under `workers/` doesn't exist in production; it may just not be in this repo.
