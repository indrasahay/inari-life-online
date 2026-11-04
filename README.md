# Inari Life — static storefront (GitHub Pages)

A fully static, responsive e‑commerce storefront for **Inari Life**. No build step, no server, no
dependencies — plain HTML, CSS and JavaScript. All 220 products from the seller catalogue
(`Amazon_Listing_File_30th_Oct_Categorized.xlsx`) are embedded in `js/data.js`, and every
"Buy now" button links straight to the live Amazon.in listing.

```
site/
├── index.html          # markup: header, 3 banners, sections, PDP modal, footer
├── css/styles.css      # brand system, layout, responsive breakpoints
├── js/data.js          # generated from the sheet — 220 products, do not hand-edit
├── js/app.js           # rendering, discount maths, search/filter, PDP, carousel
└── assets/
    ├── inari-logo.png  # full lockup (header / footer)
    ├── inari-mark.png  # chevron mark, transparent (brand banner)
    └── favicon.png
```

## Deploying to GitHub Pages

1. Create a repository, e.g. `inari-life-store`.
2. Push the **contents of the `site/` folder** to the repo root (`index.html` must be at the root):
   ```bash
   git init
   git add .
   git commit -m "Inari Life storefront"
   git branch -M main
   git remote add origin https://github.com/<user>/inari-life-store.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   Branch `main`, folder `/ (root)` → **Save**.
4. The site goes live at `https://<user>.github.io/inari-life-store/` in about a minute.
   A custom domain can be added under **Settings → Pages → Custom domain**.
   (`.nojekyll` is included so GitHub serves the files as-is.)

Local preview: `python3 -m http.server 8000` inside `site/`, then open `http://localhost:8000`.
Opening `index.html` directly from disk also works, because the data is loaded as a script
rather than fetched as JSON.

## How the data works

`js/data.js` is generated from the sheet — one object per row:

| field | source column |
| --- | --- |
| `t` | `item-name` |
| `d` | `item-description` (trimmed at a sentence boundary, ≤1100 chars) |
| `sku` | `seller-sku` |
| `asin` | `asin1` |
| `price` | `Selling Price` |
| `mrp` | `maximum-retail-price` |
| `cat` | `Category` (full path) |
| `sub` | short category label used on cards/chips |
| `grp` | one of `home`, `beauty`, `tools`, `electronics` — drives the filter tabs |
| `url` | `Amazon Product Link` |
| `qty` | `quantity` |
| `date` | `open-date` — used to order New Arrivals |

Category → tab mapping: `Beauty …` → Beauty & Personal Care, `Home Improvement …` → Tools &
Hardware, `Electronics …` → Electronics, everything else (`Home & Kitchen`, `Pet Supplies`,
`Car & Motorbike`) → Home & Kitchen. That covers all 19 category paths in the sheet.

**Refreshing the catalogue**: replace the sheet, re-run the parser, and overwrite `js/data.js`.
Keep the same shape and nothing else needs to change.

## Calculations

Discount is computed in the browser, never stored:

```js
// % Discount = (MRP − Price) / MRP × 100
function disc(p) {
  if (!(p.mrp > 0) || !(p.price >= 0) || p.price >= p.mrp) return 0; // guards
  return Math.round(((p.mrp - p.price) / p.mrp) * 100);
}
```

The guards return `0` instead of a negative or `NaN` badge when MRP is missing, zero, or below
the selling price, so bad rows degrade quietly. The sheet's MRPs are uniformly 30% above selling
price, so every live listing shows a 30% badge today — the maths is dynamic, not hardcoded, and a
future row priced differently will show its own number.

## Section heuristics

- **Deal of the Day** — sorted by discount % descending, then rupee savings, then lowest price.
  Because the sheet's discount is uniform, rupee savings decide the order.
- **Focus Products** — the sheet has no "bestseller" field, so we take the deepest-stocked SKU of
  each sub-category (`quantity` as the stock signal), then spread the eight strongest across the
  four groups so no aisle dominates.
- **New Arrivals** — ordered by `open-date`, newest first.

## Images

Amazon's ASIN image service does not resolve these ASINs yet (it answers with a 1×1 pixel), so
every card runs a fallback chain in `img.onerror` / `onload`:

1. `https://images-na.ssl-images-amazon.com/images/P/{ASIN}.jpg`
2. `…/images/P/{ASIN}._SL500_.jpg` (alternate size parameter)
3. DeoDap product search by **seller SKU** — used as a sourcing link, since the search endpoint
   returns an HTML page rather than an image
4. DeoDap product search by **title keywords**
5. A branded placeholder tile (category glyph + label), so a card never breaks

The `<1` pixel test in `onload` is what catches Amazon's transparent-GIF reply, which would
otherwise count as a successful load. The PDP additionally exposes a "Search DeoDap for this SKU"
link. Once Amazon publishes imagery for an ASIN, images appear automatically — no code change.

## Accessibility & performance

- Semantic landmarks, skip link, `aria-selected` tabs, labelled search, `Esc` closes the PDP,
  focus returned to the trigger, `aria-hidden` maintained on the dialog.
- Images are `loading="lazy"` and only armed when near the viewport (IntersectionObserver).
- Reduced-motion media query disables the carousel animation and smooth scrolling.
- No frameworks, no tracking scripts, one font family. Total payload ≈ 210 KB.

## Disclaimer

Prices, MRP and availability reflect the seller sheet dated 30 Oct 2026 and can change on
Amazon.in. Checkout happens on Amazon; this site never processes payment.
