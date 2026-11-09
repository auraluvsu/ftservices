# ftservices

React + Vite + Tailwind CSS (v4) site for FT Services. See `README.md` for an overview.

## Commands

- `npm run dev` – start the Vite dev server
- `npm run build` – production build
- `npm run preview` – preview the production build
- `npm run typecheck` – `tsc --noEmit`
- `npm run format` – format with oxfmt
- `npm run test:e2e` – Playwright e2e suite (all browsers); builds and previews the site itself
- `npm run test:e2e:local` – same, skipping WebKit (set `SKIP_WEBKIT=1`)

Run `npm run typecheck` and `npm run test:e2e:local` before opening a PR.

## Structure

- `src/main.tsx` – entrypoint; mounts `App` and imports `src/index.css`
- `src/App.tsx` – all pages and components; hand-rolled routing (`Link` + `popstate`, no router library). Unknown paths render `NotFoundPage`
- `src/index.css` – global CSS and Tailwind import
- `api/inquiry.ts` – Vercel serverless function for the quote form (currently Ethereal; Resend migration planned in `todo.md`)
- `e2e/` – Playwright specs; `e2e/fixtures.ts` holds shared helpers and the `/api/inquiry` mock
- `playwright.config.ts` – projects: chromium, firefox, webkit, mobile-chrome (Pixel 7), mobile-safari (iPhone 14)
- `index.html` – Vite HTML shell (favicon: `public/image_c0ba5da2.ico`)
- `vite.config.ts` – React + Tailwind plugins, `@` alias for `src`
- `vercel.json` – build config and SPA rewrite (all non-`/api/` paths serve `index.html`)
- `.github/workflows/` – `test.yml` (typecheck, build, e2e) and `claude-review.yml` (PR review)

## Styling

Tailwind CSS v4 via `@tailwindcss/vite`; no Tailwind or PostCSS config file needed. Put global element styles in `@layer base { ... }` so utilities still override them.

## Testing conventions

- Always mock `/api/inquiry` in e2e tests; never send real email.
- Use role/label locators, not CSS selectors or `waitForTimeout`.
- Form field ids come from `useId()`, so multiple forms on one page don't collide.
- WebKit can't run on some distros (e.g. Fedora lacks libicu 74); use `test:e2e:local` there. CI runs everything.
- Known gap: the axe colour-contrast test is skipped (`test.fixme`) until the contrast fixes in `todo.md` land.
