# Frontend Testing Plan

## Context

The site is a single large `src/App.tsx` (React 19 + Vite 8 + Tailwind v4) with hand-rolled client-side routing (`Link` + `popstate`) and one serverless endpoint (`api/inquiry.ts`). The highest-risk features are the quote form (sends leads), navigation/routing, the responsive header, and the Leaflet map.

> **Status:** this was written as a plan and is now partly implemented. The e2e suite and CI are in place; unit tests are deferred. See "Decisions and status" at the bottom for what is done. Phases below describe the original plan, including parts we chose not to do yet.

## Tooling decision

| Layer | Tool | Why |
|---|---|---|
| Unit/component | **Vitest + React Testing Library + jsdom** | Native to Vite (reuses `vite.config.ts` and the `@` alias); fast |
| End-to-end | **Playwright** (`@playwright/test`) | Auto-waiting, built-in test runner, multi-browser + mobile viewports, network mocking, trace viewer, CI-friendly |
| Accessibility | **@axe-core/playwright** | Catches WCAG issues on every page cheaply |
| API handler | **Vitest** (node environment) | `api/inquiry.ts` is a plain function; mock the mail client |
| Puppeteer | **Not recommended** | It overlaps entirely with Playwright (same capabilities, Chromium-first, no built-in runner/assertions). Running both doubles the maintenance. The only reason to add it would be a standalone script such as a prerender or PDF job, which this project doesn't have. |

## Phase 0 — Prerequisites (small, enables everything)

1. Create `todo.md` ✅ (done).
2. **Fix SPA deep links on Vercel.** `vercel.json` has no rewrite, so visiting `/contact` directly (or refreshing) will 404 in production. Add `"rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]`. E2E deep-link tests will expect this. (Vite dev/preview already fall back to `index.html`.)
3. Add scripts to `package.json`: `test` (vitest run), `test:watch`, `test:e2e` (playwright test), `test:e2e:ui`, `typecheck` (`tsc --noEmit`).
4. Install dev deps: `vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test @axe-core/playwright`, then `npx playwright install --with-deps chromium firefox webkit`.
5. Add `test` block to `vite.config.ts` (`environment: "jsdom"`, `setupFiles: "./src/test/setup.ts"`, `exclude: ["e2e/**"]`). Setup file imports `@testing-library/jest-dom/vitest` and stubs `window.scrollTo` and `IntersectionObserver` (used by `Reveal`).
6. Add `playwright.config.ts`: `webServer` runs `npm run build && npm run preview` (tests the production bundle); `baseURL` from the preview port; projects: `chromium`, `firefox`, `webkit`, plus mobile (`Pixel 7`, `iPhone 14`); `trace: "on-first-retry"`; `retries: 2` in CI.
7. `.gitignore`: add `playwright-report/`, `test-results/`, `coverage/`.

## Phase 1 — Refactor for testability (minimal, optional but valuable)

`App.tsx` exports only `App`, so components can't be tested in isolation. Do the least that helps:
- Split out `QuoteForm`, `Header`, `Accordion` into `src/components/` (named exports), and move `pageData` to `src/data/pageData.ts`. Pure move, no behaviour change.
- Fix the duplicate id: the textarea uses a fixed `id="message"` while other fields use `` `-${compact}` `` suffixes. Two non-compact forms on one page would collide, which also breaks label association. Use `useId()`.
- Add `data-testid` only where no accessible role/label exists (e.g. the map container). Prefer `getByRole` / `getByLabel`.

If you'd rather not refactor, Phase 2 can be skipped and E2E will cover the same behaviour.

## Phase 2 — Unit/component tests (Vitest + RTL)

**QuoteForm** (`src/components/QuoteForm.test.tsx`) — highest value
- Empty submit shows name, email and phone errors; no `fetch` call.
- Invalid email (`a@b`) shows email error; valid email clears it.
- Whitespace-only name/phone rejected.
- Valid submit POSTs JSON to `/api/inquiry` with `name/email/phone/message` (mock `fetch`).
- Button shows "Sending…" and is disabled during the request (deferred promise).
- 200 → success `role="status"` message; "Send another enquiry" returns to the form.
- Non-2xx and network rejection → `role="alert"` message including the fallback email address; form remains filled and usable.
- `compact` variant has no message textarea.

**Header** — desktop nav links present; "Open menu"/"Close menu" toggle the mobile nav; "Used forklifts" parent shows active state on `/used-forklifts`, `/diesel-forklifts`, `/electric-forklifts`; scroll adds the `scrolled` state (fire `scroll` event).

**Link / routing** — clicking a `Link` calls `preventDefault`, pushes history and updates the rendered page; `popstate` (back button) restores the previous page; scroll resets to top.

**App routing** — each known path renders its page heading (`/`, `/new-forklifts`, `/used-forklifts`, `/forklift-services`, `/diesel-forklifts`, `/electric-forklifts`, `/forklift-hire`, `/luigong-forklifts`, `/contact`). Unknown path falls back to `/new-forklifts` content (document this as intended behaviour or change it to a 404 page).

**Accordion** — first item open by default; clicking another opens it and closes the first.

**LocationMap** — mock `react-leaflet` (jsdom has no layout engine); assert it renders with the right marker coordinates/popup text. Real rendering is covered in E2E.

**API handler** (`api/inquiry.test.ts`, node environment) — mock the mail client:
- Non-POST → 405 with `Allow: POST`.
- Missing name/email/phone or invalid email → 400.
- Valid body → mail client called with `to` = `INQUIRY_TO`, `replyTo` = customer, HTML-escaped content (`<script>` in message is escaped), CR/LF stripped from subject and reply-to name (header injection).
- Field length clamps (name 200, message 5000).
- Mail client throws → 500, no stack leaked.
- After the Resend migration (see `todo.md`) these tests mock `resend` instead of `nodemailer`; write them against the handler's behaviour so the swap only changes the mock.

Coverage target: ≥80% lines on the form, header, routing and API handler. Don't chase 100% on static marketing markup.

## Phase 3 — E2E tests (Playwright)

Layout: `e2e/` with `fixtures.ts` (shared helpers, `page.route("**/api/inquiry")` mocks), one spec per area. Always mock `/api/inquiry` so tests never send real email.

1. **`navigation.spec.ts`**
   - Visit each route via its nav link; assert URL, `<h1>`, and active nav state.
   - Deep link / hard refresh on every route loads correctly (guards the Vercel rewrite).
   - Browser back/forward works across 3+ navigations.
   - Footer links work. Logo ("FT Services home") returns to `/`.
2. **`quote-form.spec.ts`** (run on the Home hero form, the Contact page form, and the sticky/mobile quote)
   - Validation errors, then successful submit with mocked 200 → success state.
   - Mocked 500 → error alert; retry succeeds.
   - Request payload assertion via `page.waitForRequest`.
   - Double-click submit sends once (button disabled while sending).
   - Optional smoke against a Vercel preview deploy with a real inbox, behind an env flag, post-Resend.
3. **`mobile.spec.ts`** (Pixel 7 / iPhone 14 projects)
   - Hamburger opens/closes; links navigate and close the menu; "Used forklifts" submenu usable.
   - No horizontal overflow (`scrollWidth <= clientWidth`) on each route.
   - Mobile quote CTA visible and opens the form.
4. **`map.spec.ts`** — `/contact` shows Leaflet tiles container and a marker; clicking marker shows popup with address. Block external tile requests with `page.route` to keep it hermetic and fast.
5. **`accessibility.spec.ts`** — `@axe-core/playwright` scan of each route in desktop + mobile; fail on `serious`/`critical`. Keyboard test: Tab reaches nav and form fields in order; Enter submits; Escape closes mobile menu (add if missing).
6. **`seo.spec.ts`** (cheap) — each route has a non-empty `<title>`; favicon loads; no console errors or failed requests on load.
7. **`visual.spec.ts`** (optional, last) — `toHaveScreenshot` for Home and Contact at desktop and mobile widths, with animations disabled and `Reveal` content forced visible. Only add once the design stabilises; baselines are generated and committed from CI's Linux environment to avoid font drift.

Guidelines: role/label locators only; no `waitForTimeout`; each test independent; `test.describe.configure({ mode: "parallel" })`.

## Phase 4 — CI

Add `.github/workflows/test.yml` (alongside `claude-review.yml`), on `pull_request` and push to `master`:
- Job `unit`: checkout → setup-node (version from `.mise.toml`) → `npm ci` → `npm run typecheck` → `npm test -- --coverage`.
- Job `e2e`: `npm ci` → cache `~/.cache/ms-playwright` → `npx playwright install --with-deps` → `npm run test:e2e`; upload `playwright-report/` and traces as artifacts on failure.
- Make both required checks on `master` in GitHub branch protection.
- Optional: run E2E against the Vercel preview URL (`BASE_URL` env) instead of a local build.

## Suggested order and sizing

1. Phase 0 (≈1 hr), including the Vercel rewrite fix, which is a real production bug.
2. API handler tests + QuoteForm tests (the lead-generation path) — biggest risk reduction.
3. Playwright navigation + quote-form + mobile specs.
4. CI workflow.
5. Accessibility, map, SEO specs.
6. Phase 1 refactor can happen before step 2 if you want component tests; otherwise do it later.
7. Visual regression last, optional.

## Verification

- `npm run typecheck && npm test` passes locally; coverage report generated.
- `npm run test:e2e` passes on chromium, firefox, webkit and both mobile projects; `npx playwright show-report` opens cleanly.
- Sanity-break check: temporarily break the email regex or remove a route and confirm a unit test and an E2E test each fail, then revert.
- Open a draft PR and confirm the new workflow runs green and artifacts upload on a forced failure.

## Decisions and status

- Unknown URLs now render a real 404 page (`NotFoundPage`). ✅
- E2E carries coverage for now; the component split and Vitest unit tests are deferred. ✅ (decided)
- Screenshot comparisons: skipped for now. ✅ (decided)
- Done: Vercel SPA rewrite, `useId()` form ids, Playwright config, `e2e/` specs (navigation, 404, quote-form, mobile, map, accessibility, health).
- Done: `.github/workflows/test.yml` (typecheck + build, and e2e on all browsers with report upload).
- Not done yet: API handler unit tests (deferred until the Resend migration, see `todo.md`).
- Not done yet: `seo.spec.ts` and the `Escape`-closes-menu keyboard test.
- Known gap: the axe colour-contrast check is `test.fixme` in `e2e/accessibility.spec.ts` until the contrast fixes in `todo.md` land.
- Local runs: `npm run test:e2e:local` skips WebKit (this Fedora box lacks libicu 74). CI runs every project.
