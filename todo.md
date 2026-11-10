# TODO

## Finish the Resend setup

Context: `api/inquiry.ts` now sends through Resend from `website@ftserviceshayes.com` (override with `INQUIRY_FROM`).

Plan:
- [x] Create a Resend account and add the domain `ftserviceshayes.com`
- [x] Add the DNS records Resend provides (DKIM TXT, SPF TXT, MX on `send.` subdomain). Merge with any existing SPF record rather than adding a second one
- [ ] Create a send-only API key
- [ ] Swap `RESEND_API_KEY` for a sending-only key scoped to `ftserviceshayes.com`
- [ ] At launch, set `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel (`INQUIRY_FROM` and `INQUIRY_TO` are optional overrides). Create a free Upstash Redis database for the latter two
- [x] `npm i resend`; remove `nodemailer` and `@types/nodemailer`
- [x] Rewrite `createTransport()` / `sendMail` in `api/inquiry.ts` to `resend.emails.send({ from, to, replyTo: email, subject, text, html })`; delete the Ethereal code and the `getTestMessageUrl` log. Keep validation/escaping as is
- [ ] Submit a real enquiry on the deployed site and confirm it lands in mike@ftserviceshayes.com (check spam too)
- [x] Spam protection: honeypot field and per-IP rate limiting (Upstash)

Notes:
- The From address does not need to be a real mailbox; Reply-To already points at the customer.
- Free tier: ~3,000 emails/month, 100/day.

## Finish frontend testing

E2E suite and CI are done (see `TESTING_PLAN.md`). Remaining:

- [ ] API handler unit tests (after the Resend migration)
- [ ] `seo.spec.ts` (titles, favicon, no console errors)
- [ ] Optional: Vitest component tests, visual regression

## Accessibility: colour contrast (found by e2e axe scan)

- [ ] White text on brand orange `#F56300` is 3.14:1 (needs 4.5:1 for normal text): primary buttons, form submit, header "Get a quote". Options: darken the button background (~`#C74F00` or darker), or use dark text on orange
- [ ] Grey text just under threshold: `#777` on white (4.47:1), `#777` on `#0a0a0a`/`#f4f4f2`, footer `#707070` on `#0a0a0a` (3.99:1), `#a8a8a8` on white in `.sticky-quote__phone small` (2.37:1)
- [ ] Then remove `test.fixme` in `e2e/accessibility.spec.ts` ("colour contrast")
