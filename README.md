# EEE Club of HSTU — Website

Website for the Electrical & Electronic Engineering Club at Hajee Mohammad Danesh Science & Technology University (HSTU), Dinajpur.

## Pages

| Section | Pages |
|---|---|
| Home | `index.html` (3D hero + Partners section) |
| About | `about.html`, `history.html`, `leadership.html`, `advisory.html`, `alumni.html`, `constitution.html` |
| Events | `events.html`, `event.html`, `archive.html`, `notices.html` |
| Content | `blog.html`, `post.html`, `magazine.html`, `resources.html`, `gallery.html` |
| Verify & contact | `verify.html`, `contact.html` |
| Legal & utility | `privacy.html`, `terms.html`, `sitemap.html`, `offline.html`, `404.html` |

## How it's built

- Plain static HTML, CSS and vanilla JavaScript (ES modules). No build step; deploy the folder as-is on Netlify (`netlify.toml`).
- `assets/site.js` renders the shared header (dropdown nav, mobile menu, search trigger) and footer (including social links/contact from `site_settings/footer`, Privacy/Terms links, and Cookie settings) on every page, and powers tabs, filters, search, countdowns and scroll reveals.
- `assets/site.css` holds shared styles, including `.prose` formatting for Markdown, tables, images and KaTeX math.
- `assets/markdown.js` lazy-loads pinned CDN versions of `marked@15.0.7`, `dompurify@3.2.4` and `katex@0.16.21` to render sanitized Markdown and `$…$` / `$$…$$` LaTeX math.
- `assets/search.js` provides a native `<dialog>` site search modal (`/` or `Ctrl/Cmd+K`) indexing all static pages plus published Firestore content.
- The homepage hero is a 3D toroidal coil and sine-wave field drawn on a `<canvas>`; it follows the cursor and shows a still frame for visitors who prefer reduced motion.

## Firebase & Firestore hydration

- Config lives in `assets/firebase-config.js` (while `projectId` is `"YOUR_PROJECT_ID"`, the site runs in offline demo mode using built-in fallback HTML).
- `assets/db.js` loads the Firebase modular SDK (`12.11.0`) and exposes `window.EEEDB`. Every public collection query uses `where("published", "==", true)` and sorts in the browser; when unconfigured, missing, or on error, pages keep their built-in static content.
- Security rules and the shared data contract live in `firebase/firestore.rules` and `firebase/SCHEMA.md` (managed by the separate admin app `eee-club-hstu-admin`).

| Page / Component | Firestore collection or document |
|---|---|
| `index.html` | `event_logs`, `partners` |
| `events.html`, `archive.html` | `event_logs` |
| `notices.html` | `notices` |
| `blog.html`, `post.html` | `blogs` (`post.html?id=<docId>`) |
| `leadership.html`, `advisory.html` | `leadership_members` |
| `gallery.html` | `gallery_items` |
| `magazine.html` | `magazines` |
| `resources.html` | `resources` |
| `contact.html` | `faqs`, `site_settings/footer`, `site_settings/location` |
| `constitution.html`, `history.html`, `privacy.html`, `terms.html` | `pages_static/{constitution\|history\|privacy\|terms}` |
| `verify.html` | `certificates/{CERT-ID}` (`getDoc`) |
| Forms (`alumni.html`, `contact.html`, footer Pulse) | Writes to `alumni_registrations`, `contact_messages`, `newsletter_subscribers` |
| Footer (`assets/site.js`) | `site_settings/footer` |
| Search (`assets/search.js`) | `blogs`, `event_logs`, `notices`, `leadership_members`, `resources`, `faqs`, `magazines` |

## PWA, SEO & Analytics

- **Canonical `SITE_URL`:** Currently `https://eee-club-hstu.netlify.app` (assumed for Netlify deployment). Update it in `assets/site.js` (`SITE_URL`), `index.html` JSON-LD, `robots.txt`, `sitemap.xml`, and page `<link rel="canonical">` / `og:*` tags when deploying to a custom domain.
- **PWA:** `manifest.webmanifest`, icons in `assets/icons/` (`192`, `512`, `maskable 512`), `offline.html`, and root `sw.js` (network-first HTML with `offline.html` fallback; stale-while-revalidate for same-origin static assets; Firestore/Google endpoints bypassed). `netlify.toml` serves `sw.js` and `manifest.webmanifest` with `Cache-Control: no-cache`.
- **SEO:** Every public page includes canonical, Open Graph (`assets/og.png` 1200×630) and Twitter Card tags; `index.html` adds `EducationalOrganization` + `WebSite` (`SearchAction`) JSON-LD; `robots.txt` and `sitemap.xml` sit at the root.
- **Analytics with consent:** `assets/consent.js` shows a bottom consent banner and only loads Google Analytics (`G-BZ4EJZ20FJ`, `anonymize_ip: true`) after the visitor clicks **Accept**. Declining sends zero Google requests. Visitors can reopen the banner from **Cookie settings** in the footer.
