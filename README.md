# Hamza Riaz's personal website

A static, responsive academic portfolio for https://hamzariaz970.github.io/.

## Files

- `index.html`: biography, publications, projects, research experience, and profile links.
- `styles.css`: pastel palette, typography, spacing, and responsive layouts.
- `script.js`: project filters, mobile navigation, and the current section indicator.
- `assets/Hamza_Riaz_CV.pdf`: the current two-page CV.
- `assets/hamza-riaz.jpg`: the supplied profile photograph.

No package installation or build step is required. The page content, links, and expandable summaries also work without JavaScript.

## Preview locally

From this directory, run:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## GitHub Pages

The repository must be named `hamzariaz970.github.io`. In **Settings → Pages**, choose **Deploy from a branch**, then `main` and `/ (root)`. The `.nojekyll` file makes GitHub serve these files as a static site.

## Update content

Edit the visible text in `index.html`. Publication titles are listed before authors; manuscripts under review are explicitly labeled. Change publication statuses only when they change, and keep the CV in sync.

To add a project, copy an existing `project-card` article and update its text, links, and `data-category`. Supported categories are `ai`, `systems`, and `apps`; multiple categories are separated by spaces.

To update the CV, replace `assets/Hamza_Riaz_CV.pdf` with the latest PDF. The existing links will continue to work. Update the footer's last-updated date and `sitemap.xml` when making substantive content changes.

The site uses system fonts and has no analytics, trackers, external JavaScript, or runtime dependencies.
