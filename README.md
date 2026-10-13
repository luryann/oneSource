# One Source Entertainment website

A static, bilingual (English and Spanish) site for One Source Entertainment. It has no framework and nothing to install except Node.

## How it works

- `src/content/en.mjs` and `src/content/es.mjs` hold **all the words**. Edit these to change text.
- `src/config.mjs` holds phone, email, Instagram, site URL and the form setting.
- `assets/` holds the CSS, JS, logo files and photos.
- `npm run build` generates every page into `docs/`, which is what GitHub Pages serves.

After any change, commit and push to `main`. GitHub builds and publishes the site automatically (see below). `docs/` is generated, so it is not committed.

Preview locally: `npm run build && npm run preview`, then open http://localhost:4173.

## Publish on GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the site and publishes it on every push to `main`.

1. Create a GitHub repo and push this folder to its `main` branch.
2. Repo **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.
3. Push a commit, or run the workflow by hand from the **Actions** tab (**Deploy site → Run workflow**).
4. When it turns green, the live link appears on the run and in **Settings → Pages**.
5. Custom domain (optional): add it in **Settings → Pages → Custom domain** and point your DNS at GitHub. The next deploy picks up the new address automatically, because the workflow passes it to the build as `SITE_URL`.
6. Submit `https://YOUR-SITE/sitemap.xml` in Google Search Console.
7. Create a free Google Business Profile for Los Angeles. This does more for "DJ near me" searches than anything on the site.

## Replace before launch

| What | Where |
| --- | --- |
| Photos | `assets/photos/`. Keep the same file names (`.jpg`) and the site picks them up. Any size works; about 2000px wide is plenty. |
| Booking form | Create a form at formspree.io and paste its URL into `formEndpoint` in `src/config.mjs`. Until then the form validates and shows "Request sent" but **sends nothing**. |
| Reviews | `reviews` in both content files. Set `showReviews: false` in config to hide the section until real reviews exist. |
| Family story and launch year | `about.family` and `about.timeline` in both content files |
| Deposit / how to hold a date | `bookPage.faq` in both content files |
| Packages | `packages` in both content files (names and contents are a starting point) |
| Things to confirm | Search the content files for `PLACEHOLDER`: genres, bilingual MC, lighting options, photo booth details, AV inventory, reply time. |
| Contact details | Phone and email came from the old DJLX-LSV.com site. Confirm they are still right. |

### Photo files

`hero` (home), `event-weddings`, `event-quinceaneras`, `event-sweet-16`, `event-school-dances`, `event-corporate`,
`service-dj`, `service-mc`, `service-lighting`, `service-sound`, `service-photo-booth`, `service-av`,
`team-alex`, `team-quentin`, `gallery-01` … `gallery-12`.

Gallery captions (used as alt text for search engines and screen readers) are in `galleryPage.items`.

## What's built in for SEO

- 20 indexable pages, with a dedicated page per event type in each language (`/weddings/`, `/es/bodas/`, …)
- A unique title and description per page targeting "[event] DJ in Los Angeles"
- `hreflang` links between English and Spanish, canonical URLs, and a sitemap with language alternates
- Structured data: EntertainmentBusiness (phone, area served, founder, languages, services), Service per event, FAQ, and breadcrumbs
- Open Graph and Twitter cards, descriptive alt text, semantic headings, and fast static pages with no framework
