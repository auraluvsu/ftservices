import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { Resend } from "resend"

// Where inquiries are delivered (matches the address shown on the site).
const INQUIRY_TO = process.env.INQUIRY_TO || "mike@ftserviceshayes.com"

// Sender address. Must be on a domain verified in Resend (ftserviceshayes.com is).
// It doesn't need to be a real mailbox: Reply-To points at the customer.
const INQUIRY_FROM =
    process.env.INQUIRY_FROM || "FT Services Website <website@ftserviceshayes.com>"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clean = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : ""

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    )

// Brand colours, matching src/index.css.
const BRAND = {
    orange: "#f56300",
    orangeDark: "#c94f00",
    ink: "#0a0a0a",
    muted: "#5d5d5d",
    soft: "#f4f4f2",
    line: "#dededb",
}
const FONT = "'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// Email clients ignore most modern CSS, so this uses nested tables and inline styles only.
function buildHtml({
    name,
    email,
    phone,
    message,
}: {
    name: string
    email: string
    phone: string
    message: string
}) {
    const e = escapeHtml
    const received = new Intl.DateTimeFormat("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Europe/London",
    }).format(new Date())
    const telHref = `tel:${phone.replace(/[^\d+]/g, "")}`
    const replySubject = encodeURIComponent("Your enquiry to FT Services")
    const mailHref = `mailto:${encodeURIComponent(email)}?subject=${replySubject}`
    const body = e(message || "").replace(/\r?\n/g, "<br>")
    const hasMessage = message.length > 0

    const label = `font:700 11px/1 ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};padding:0 0 6px`
    const value = `font:600 16px/1.4 ${FONT};color:${BRAND.ink};padding:0 0 20px`
    const link = `color:${BRAND.ink};text-decoration:none;border-bottom:2px solid ${BRAND.orange}`

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>New website enquiry</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.soft};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">New enquiry from ${e(name)} (${e(phone)}) via the FT Services website.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.soft}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px">

    <!-- Header -->
    <tr><td style="background:${BRAND.ink};border-radius:22px 22px 0 0;padding:28px 36px 24px">
      <div style="font:800 22px/1 ${FONT};color:#ffffff;letter-spacing:-.01em">FT Services<span style="color:${BRAND.orange}">.</span></div>
      <div style="font:600 12px/1 ${FONT};color:#a8a8a8;letter-spacing:.14em;text-transform:uppercase;padding-top:8px">Forklifts &middot; Hayes</div>
    </td></tr>
    <tr><td style="background:${BRAND.orange};height:5px;line-height:5px;font-size:0">&nbsp;</td></tr>

    <!-- Card -->
    <tr><td style="background:#ffffff;padding:36px 36px 12px;border-left:1px solid ${BRAND.line};border-right:1px solid ${BRAND.line}">
      <div style="font:700 11px/1 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${BRAND.orangeDark};padding-bottom:12px">New website enquiry</div>
      <h1 style="margin:0 0 6px;font:800 28px/1.15 ${FONT};color:${BRAND.ink};letter-spacing:-.02em">${e(name)} wants a quote</h1>
      <p style="margin:0 0 28px;font:500 14px/1.5 ${FONT};color:${BRAND.muted}">Received ${e(received)}</p>

      <!-- Contact details -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.soft};border-radius:16px;border-left:4px solid ${BRAND.orange}">
        <tr><td style="padding:24px 24px 4px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="${label}">Name</td></tr>
            <tr><td style="${value}">${e(name)}</td></tr>
            <tr><td style="${label}">Email</td></tr>
            <tr><td style="${value}"><a href="${mailHref}" style="${link}">${e(email)}</a></td></tr>
            <tr><td style="${label}">Phone</td></tr>
            <tr><td style="${value}"><a href="${e(telHref)}" style="${link}">${e(phone)}</a></td></tr>
          </table>
        </td></tr>
      </table>

      <!-- Message -->
      <div style="font:700 11px/1 ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};padding:32px 0 10px">Message</div>
      <div style="border:1px solid ${BRAND.line};border-radius:16px;padding:20px 22px;font:500 16px/1.65 ${FONT};color:${hasMessage ? BRAND.ink : BRAND.muted};${hasMessage ? "" : "font-style:italic;"}">${hasMessage ? body : "No message left."}</div>

      <!-- Actions -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 28px">
        <tr>
          <td style="border-radius:999px;background:${BRAND.orange}">
            <a href="${mailHref}" style="display:inline-block;padding:15px 28px;font:700 15px/1 ${FONT};color:${BRAND.ink};text-decoration:none;border-radius:999px">Reply to ${e(name.split(/\s+/)[0])}</a>
          </td>
          <td width="12" style="font-size:0">&nbsp;</td>
          <td style="border-radius:999px;border:2px solid ${BRAND.ink}">
            <a href="${e(telHref)}" style="display:inline-block;padding:13px 26px;font:700 15px/1 ${FONT};color:${BRAND.ink};text-decoration:none;border-radius:999px">Call ${e(phone)}</a>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:${BRAND.ink};border-radius:0 0 22px 22px;padding:22px 36px">
      <div style="font:500 12px/1.6 ${FONT};color:#a8a8a8">Sent from the quote form on the FT Services website. Hit reply to respond directly to the customer.</div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}

// Created lazily so a missing key surfaces as a logged 500 rather than a crash at import.
let resend: Resend | undefined
function getResend() {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set")
    return (resend ??= new Resend(key))
}

// Per-IP limit, shared across function instances via Upstash Redis. Skipped when the
// Upstash env vars aren't set (local dev), so it only applies once they're configured.
const RATE_LIMIT = 5
const RATE_WINDOW = "1 h"
let ratelimit: Ratelimit | null | undefined
function getRatelimit() {
    if (ratelimit !== undefined) return ratelimit
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
        console.warn("UPSTASH_REDIS_REST_URL/TOKEN not set; enquiries are not rate limited")
        return (ratelimit = null)
    }
    return (ratelimit = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT, RATE_WINDOW),
        prefix: "ratelimit:inquiry",
    }))
}

function clientIp(req: VercelRequest) {
    const header = (name: string) => {
        const v = req.headers[name]
        return (Array.isArray(v) ? v[0] : v)?.split(",")[0]?.trim()
    }
    return header("x-real-ip") || header("x-forwarded-for") || "unknown"
}

// True if this request may proceed. Fails open: if Redis is unreachable we'd rather
// risk some spam than drop a genuine enquiry.
async function withinRateLimit(req: VercelRequest) {
    const limiter = getRatelimit()
    if (!limiter) return true
    try {
        const { success } = await limiter.limit(clientIp(req))
        return success
    } catch (err) {
        console.error("Rate limit check failed; allowing request", err)
        return true
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return res.status(405).json({ error: "Method not allowed" })
    }

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<
        string,
        unknown
    >
    // Honeypot: the "website" field is hidden from people, so only bots fill it in.
    // Pretend it worked so they don't learn to skip it.
    if (clean(body.website, 200)) {
        return res.status(200).json({ ok: true })
    }

    const name = clean(body.name, 200)
    const email = clean(body.email, 320)
    const phone = clean(body.phone, 50)
    const message = clean(body.message, 5000)

    if (!name || !EMAIL_RE.test(email) || !phone) {
        return res.status(400).json({ error: "Name, valid email and phone are required." })
    }

    if (!(await withinRateLimit(req))) {
        res.setHeader("Retry-After", "3600")
        return res.status(429).json({ error: "Too many enquiries. Please try again later." })
    }

    try {
        const { data, error } = await getResend().emails.send({
            from: INQUIRY_FROM,
            to: INQUIRY_TO,
            replyTo: `"${name.replace(/["\r\n]/g, "")}" <${email}>`,
            subject: `New website enquiry from ${name.replace(/[\r\n]/g, " ")}`,
            text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message || "(no message)"}`,
            html: buildHtml({ name, email, phone, message }),
        })
        if (error) throw error
        console.log("Inquiry sent via Resend:", data?.id)
        return res.status(200).json({ ok: true })
    } catch (err) {
        console.error("Failed to send inquiry", err)
        return res.status(500).json({ error: "Could not send your enquiry." })
    }
}
