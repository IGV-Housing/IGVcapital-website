# IGV Capital — igvcapital.com

Static site (self-contained HTML) served by Cloudflare Pages, with two
Cloudflare Workers for routing and contact-form verification.

Migrated off Webflow. No build step, no bundler — files are served as authored.

---

## Repository layout

```
igvcapital/
├── public/                     ← Pages build output directory (web root)
│   ├── index.html
│   ├── about/index.html
│   ├── contact/index.html
│   └── assets/
│       ├── css/
│       ├── js/
│       │   └── config.js       ← environment config, load first
│       ├── img/
│       └── fonts/              ← only if self-hosting Bitter/Montserrat
├── workers/
│   ├── router/                 ← igvcapital-router
│   └── contact-verify/         ← igvcapital-contact-verify
├── .gitignore
└── README.md
```

`assets/` sits **inside** `public/`. Pages only serves what is inside the
output directory — an `assets/` folder at repo root would 404 on the live site.

All asset references are root-absolute (`/assets/img/logo.svg`), never
relative. Relative paths break on nested pages once the site is a single
Pages project rather than one project per page.

---

## Environments

| | Local | Staging | Production |
|---|---|---|---|
| Branch | `feature/*` | `staging` | `main` |
| URL | `localhost:5500` | `staging.igvcapital.com` | `igvcapital.com` |
| HubSpot form | staging | staging | live |
| Worker | `-staging` | `-staging` | production |

Environment is decided at runtime by hostname in `config.js`. Anything that
is not `igvcapital.com` / `www.igvcapital.com` is treated as staging, so
preview deployments and localhost are covered automatically.

Staging shows a magenta banner across the top. If you don't see it, you're
on production.

**Protect staging.** Enable preview-deployment access control on the Pages
project (requires Cloudflare Access), otherwise staging is publicly
crawlable with live form integrations attached.

---

## Brand

| Token | Value |
|---|---|
| Evergreen | `#1A4848` |
| Magenta | `#952944` |
| Off White | `#FFFDF3` |

> Evergreen is `#1A4848`. The brand guide PDF lists `#194823`; that value
> visibly mismatches the logo artwork and is superseded.

**Typography — IGV Capital only.** Bitter (serif) for headings, quotes and
body copy. Montserrat for UI chrome, labels and buttons. Every other IGV
property is Montserrat-only.

---

## HubSpot

Portal `342997618`, region `na3`.

| Form | GUID |
|---|---|
| Contact — LIVE | `314766c8-b4b1-4401-a417-fd128bef52e5` |
| Contact — STAGING | `836e494f-bdbf-43d7-a110-556ecffc6805` |

The staging form is a direct clone, so internal field names match. If you
ever edit fields on one, mirror it on the other — otherwise staging will
pass while production fails on the same payload.

Turn off notification emails and follow-up workflows on the staging clone.
Filter and purge staging contacts periodically.

Submission path is **not** the HubSpot embed script. It is:

```
custom form → reCAPTCHA → igvcapital-contact-verify → HubSpot submissions API
```

The Worker builds the endpoint from the portal ID and the `formId` sent by
the client:

```
https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formId}
```

Sending `formId` from the client keeps one Worker codebase across both
environments.

---

## Workers

`wrangler.toml` for `contact-verify`:

```toml
name = "igvcapital-contact-verify"
main = "src/index.js"
compatibility_date = "2025-01-01"

[vars]
ALLOWED_ORIGINS = "https://igvcapital.com,https://www.igvcapital.com"

[env.staging]
name = "igvcapital-contact-verify-staging"

[env.staging.vars]
ALLOWED_ORIGINS = "https://staging.igvcapital.com,http://localhost:5500"
```

Deploy:

```bash
npx wrangler deploy --env staging     # staging
npx wrangler deploy                   # production
npx wrangler dev                      # local, on :8787
```

### Secrets

Never in `wrangler.toml` — that file is committed. Set per environment:

```bash
npx wrangler secret put RECAPTCHA_SECRET
npx wrangler secret put RECAPTCHA_SECRET --env staging
npx wrangler secret put HUBSPOT_TOKEN
npx wrangler secret put HUBSPOT_TOKEN --env staging
```

| Secret | Purpose |
|---|---|
| `RECAPTCHA_SECRET` | server-side reCAPTCHA verification |
| `HUBSPOT_TOKEN` | HubSpot private app token |

---

## reCAPTCHA

v2, single site key across both environments. `staging.igvcapital.com` and
`localhost` must be listed in the key's allowed domains in the reCAPTCHA
admin console, or challenges fail everywhere except production.

Tradeoff: allowing `localhost` on a production key means anyone holding the
site key can exercise it locally. Acceptable for a contact form. To isolate,
register a separate staging key and make `recaptchaSiteKey` a ternary.

---

## Daily workflow

1. Branch off `main` in GitHub Desktop
2. Edit in VS Code, preview with Live Server
3. Commit and push — Cloudflare builds a preview deployment
4. Merge to `staging`, verify on `staging.igvcapital.com`
5. Merge to `main` — production deploys

**Never edit Worker code in the Cloudflare dashboard.** The browser editor
still works after wrangler is set up, and the next `wrangler deploy`
silently overwrites anything changed there. Treat the dashboard as
read-only for code.

Direct upload is disabled automatically once a Pages project is
Git-connected, so that half enforces itself.

---

## Cutover

An existing direct-upload Pages project cannot be converted to Git-connected.
A new project is required — which is useful, because it can be built and
tested in parallel while the live site runs untouched.

1. Create a new Pages project, connect to this repo
2. Production branch `main`, output directory `public`, no build command
3. Deploy and verify on the `*.pages.dev` URL
4. Attach `staging.igvcapital.com` to the `staging` branch
5. Deploy both Workers to their staging environments and test the full
   form path end to end
6. Move the `igvcapital.com` custom domain to the new project
7. Retire the old project once DNS has settled

Reversible at step 6 by repointing the domain back.

### Verification checklist

- [ ] No 404s in DevTools → Network on any page
- [ ] Staging banner visible on staging, absent on production
- [ ] Staging submission lands in the staging form, not the live one
- [ ] Production submission lands in the live form
- [ ] reCAPTCHA passes on localhost, staging and production
- [ ] Nav and footer consistent across all pages

---

## Known follow-ups

- CSS and JS are still inline in each page. Extracting to shared
  `style.css` / `nav.js` turns site-wide nav changes into a one-file edit.
  Do it on a branch, separately from any other change.
- `igvcapital-router` may be redundant once the site is a single Pages
  project — Pages serves `/contact/index.html` at `/contact/` natively.
  Keep it only if it does redirects, header injection or A/B work.
- Nav and footer are duplicated across the three IGV property repos with no
  automatic propagation. Acceptable at three sites; revisit if syncing
  becomes frequent.
