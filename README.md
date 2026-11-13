# FT Services

Website for FT Services, a forklift sales, hire and servicing business in Hayes. Built with React 19, Vite 8 and Tailwind CSS v4, deployed on Vercel.

## Getting started

Requires Node 22 (see `.mise.toml`).

```sh
npm ci
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm test` | Run the Vitest unit tests (API handler) |
| `npm run format` | Format with oxfmt |
| `npm run test:e2e` | Run the Playwright suite on all projects |
| `npm run test:e2e:local` | Same, but skips WebKit (for distros missing its system libraries) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:report` | Open the last HTML report |

## Project layout

```
src/main.tsx      entrypoint
src/App.tsx       all pages and components, with hand-rolled client-side routing
src/index.css     global CSS and Tailwind import
api/inquiry.ts    Vercel serverless function behind the quote form (POST /api/inquiry)
e2e/              Playwright specs
public/           images and favicon
vercel.json       build config and SPA rewrite
```

### Routing

Routing is client-side (`Link` + `popstate`) with no router library. Routes: `/`, `/new-forklifts`, `/used-forklifts`, `/diesel-forklifts`, `/electric-forklifts`, `/forklift-services`, `/forklift-hire`, `/liugong-forklifts`, `/contact`. Anything else renders the 404 page. `vercel.json` rewrites every non-`/api/` path to `index.html` so deep links and refreshes work.

### Quote form API

`POST /api/inquiry` takes JSON `{ name, email, phone, message?, website? }`. It returns `405` for other methods, `400` if name, a valid email or phone is missing, `429` if the sender's IP is over the rate limit, `200` on success and `500` if sending fails. Input is length-clamped, HTML-escaped and stripped of header-injection characters.

Email is sent through [Resend](https://resend.com). Env vars:

- `RESEND_API_KEY` (required)
- `INQUIRY_FROM` (sender; must be on a domain verified in Resend). Defaults to `FT Services Website <website@ftserviceshayes.com>`
- `INQUIRY_TO` (recipient, defaults to `mike@ftserviceshayes.com`)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (free Upstash Redis database). Enables the rate limit of 5 enquiries per IP per hour. If unset, enquiries are not rate limited; if Upstash is unreachable, requests are allowed through rather than dropped.

Spam protection: `website` is a hidden honeypot field. If it's filled in, the handler returns `200` without sending anything.

## Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) is mounted in `src/main.tsx` via `<Analytics />` from `@vercel/analytics/react`. It records page views, including client-side navigations (the script hooks `history.pushState`, which `Link` uses). Enable it in the Vercel dashboard under the project's **Analytics** tab; data appears after the next deploy. In `npm run dev` it only logs events to the console. E2e tests stub `/_vercel/insights/*`.

## Testing

End-to-end tests use Playwright with axe-core for accessibility. They run against the production build (`npm run build && npm run preview`) on Chromium, Firefox, WebKit, Pixel 7 and iPhone 14. `/api/inquiry` is always mocked, so tests never send email. Set `BASE_URL` to test an already-running deployment instead.

Unit tests for the API handler live in `tests/inquiry.test.ts` (Vitest, with Resend and Upstash mocked). See [`TESTING_PLAN.md`](TESTING_PLAN.md) for the plan and current status.

## CI

- `.github/workflows/test.yml` runs typecheck, build, unit tests and the full Playwright suite on pull requests and pushes to `master`, and uploads the Playwright report.
- `.github/workflows/claude-review.yml` has Claude review each pull request, posting inline comments and a summary. Comment `@claude` on a PR to trigger it again. It needs the `CLAUDE_CODE_OAUTH_TOKEN` repository secret.

## Contributing notes

See [`AGENTS.md`](AGENTS.md) for conventions used by AI coding agents (also loaded via `CLAUDE.md`). Open work is tracked in [`todo.md`](todo.md).

## License

Released under the GNU General Public License. See [`LICENSE`](LICENSE).
