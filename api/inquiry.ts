import type { VercelRequest, VercelResponse } from "@vercel/node"
import nodemailer from "nodemailer"

// Where inquiries are delivered (matches the address shown on the site).
const INQUIRY_TO = process.env.INQUIRY_TO || "mike@ftserviceshayes.com"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clean = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : ""

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    )

// Ethereal is a fake SMTP service: messages are captured, not delivered, and can
// be viewed via the preview URL. Use ETHEREAL_USER/ETHEREAL_PASS if set,
// otherwise a throwaway account is generated per cold start.
async function createTransport() {
    let user = process.env.ETHEREAL_USER
    let pass = process.env.ETHEREAL_PASS
    if (!user || !pass) {
        const account = await nodemailer.createTestAccount()
        user = account.user
        pass = account.pass
    }
    const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user, pass },
    })
    return { transporter, user }
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
    const name = clean(body.name, 200)
    const email = clean(body.email, 320)
    const phone = clean(body.phone, 50)
    const message = clean(body.message, 5000)

    if (!name || !EMAIL_RE.test(email) || !phone) {
        return res.status(400).json({ error: "Name, valid email and phone are required." })
    }

    try {
        const { transporter, user } = await createTransport()
        const info = await transporter.sendMail({
            from: `"FT Services website" <${user}>`,
            to: INQUIRY_TO,
            replyTo: `"${name.replace(/["\r\n]/g, "")}" <${email}>`,
            subject: `New website enquiry from ${name.replace(/[\r\n]/g, " ")}`,
            text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message || "(no message)"}`,
            html: `<p><strong>Name:</strong> ${escapeHtml(name)}<br>
<strong>Email:</strong> ${escapeHtml(email)}<br>
<strong>Phone:</strong> ${escapeHtml(phone)}</p>
<p>${escapeHtml(message || "(no message)").replace(/\n/g, "<br>")}</p>`,
        })
        const previewUrl = nodemailer.getTestMessageUrl(info)
        console.log("Inquiry sent (Ethereal). Preview:", previewUrl)
        return res.status(200).json({ ok: true })
    } catch (err) {
        console.error("Failed to send inquiry", err)
        return res.status(500).json({ error: "Could not send your enquiry." })
    }
}
