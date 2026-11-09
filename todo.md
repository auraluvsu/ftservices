# TODO

## Replace Ethereal with a real email provider (Resend)

Context: `api/inquiry.ts` currently sends through Ethereal (a fake SMTP service), so enquiries never reach `mike@ftserviceshayes.com`.

Plan:
- [ ] Create a Resend account and add the domain `ftserviceshayes.com`
- [ ] Add the DNS records Resend provides (DKIM TXT, SPF TXT, MX on `send.` subdomain). Merge with any existing SPF record rather than adding a second one
- [ ] Create a send-only API key
- [ ] Set Vercel env vars: `RESEND_API_KEY`, `INQUIRY_FROM` (e.g. `FT Services Website <website@ftserviceshayes.com>`), `INQUIRY_TO` (optional, defaults to mike@ftserviceshayes.com)
- [ ] `npm i resend`; remove `nodemailer` and `@types/nodemailer`
- [ ] Rewrite `createTransport()` / `sendMail` in `api/inquiry.ts` to `resend.emails.send({ from, to, replyTo: email, subject, text, html })`; delete the Ethereal code and the `getTestMessageUrl` log. Keep validation/escaping as is
- [ ] Test before DNS verifies by sending from `onboarding@resend.dev` to the Resend signup address
- [ ] Optional: spam protection on the public endpoint (honeypot field and/or rate limiting)

Notes:
- The From address does not need to be a real mailbox; Reply-To already points at the customer.
- Free tier: ~3,000 emails/month, 100/day.

## Add frontend testing

See `TESTING_PLAN.md`.

## Accessibility: colour contrast (found by e2e axe scan)

- [ ] White text on brand orange `#F56300` is 3.14:1 (needs 4.5:1 for normal text): primary buttons, form submit, header "Get a quote". Options: darken the button background (~`#C74F00` or darker), or use dark text on orange
- [ ] Grey text just under threshold: `#777` on white (4.47:1), `#777` on `#0a0a0a`/`#f4f4f2`, footer `#707070` on `#0a0a0a` (3.99:1), `#a8a8a8` on white in `.sticky-quote__phone small` (2.37:1)
- [ ] Then remove `test.fixme` in `e2e/accessibility.spec.ts` ("colour contrast")
