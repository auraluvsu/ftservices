import type { VercelRequest, VercelResponse } from "@vercel/node"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Hoisted so the vi.mock factories below can reference them.
const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    resendKeys: [] as string[],
    limit: vi.fn(),
    ratelimitOptions: [] as unknown[],
}))

vi.mock("resend", () => ({
    Resend: class {
        emails = { send: mocks.send }
        constructor(key: string) {
            mocks.resendKeys.push(key)
        }
    },
}))

vi.mock("@upstash/ratelimit", () => ({
    Ratelimit: class {
        static slidingWindow = (tokens: number, window: string) => ({ tokens, window })
        limit = mocks.limit
        constructor(options: unknown) {
            mocks.ratelimitOptions.push(options)
        }
    },
}))

vi.mock("@upstash/redis", () => ({
    Redis: class {
        constructor(public options: unknown) {}
    },
}))

const VALID = {
    name: "Jane Tester",
    email: "jane@example.com",
    phone: "07000 000000",
    message: "I need a quote for two electric trucks.",
}

type MockRes = VercelResponse & {
    statusCode: number
    body: unknown
    headers: Record<string, string>
}

function mockRes() {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        headers: {} as Record<string, string>,
        setHeader(name: string, value: string) {
            res.headers[name] = value
            return res
        },
        status(code: number) {
            res.statusCode = code
            return res
        },
        json(body: unknown) {
            res.body = body
            return res
        },
    }
    return res as unknown as MockRes
}

function mockReq(
    body: unknown,
    { method = "POST", headers = {} }: { method?: string; headers?: Record<string, string> } = {},
) {
    return { method, body, headers } as unknown as VercelRequest
}

// The handler caches its Resend and Ratelimit clients at module level, so each test
// re-imports it fresh to pick up that test's env vars.
async function call(req: VercelRequest) {
    const { default: handler } = await import("../api/inquiry")
    const res = mockRes()
    await handler(req, res)
    return res
}

const sentEmail = () => {
    expect(mocks.send).toHaveBeenCalledOnce()
    return mocks.send.mock.calls[0][0] as {
        from: string
        to: string
        replyTo: string
        subject: string
        text: string
        html: string
    }
}

beforeEach(() => {
    vi.resetModules()
    mocks.send.mockReset().mockResolvedValue({ data: { id: "email_123" }, error: null })
    mocks.limit.mockReset().mockResolvedValue({ success: true })
    mocks.resendKeys.length = 0
    mocks.ratelimitOptions.length = 0
    vi.stubEnv("RESEND_API_KEY", "re_test_key")
    vi.stubEnv("INQUIRY_TO", "")
    vi.stubEnv("INQUIRY_FROM", "")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
    // The handler logs on success and on handled errors; keep test output clean.
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe("method handling", () => {
    it.each(["GET", "PUT", "DELETE"])("rejects %s with 405 and Allow: POST", async (method) => {
        const res = await call(mockReq(VALID, { method }))
        expect(res.statusCode).toBe(405)
        expect(res.headers.Allow).toBe("POST")
        expect(mocks.send).not.toHaveBeenCalled()
    })
})

describe("validation", () => {
    it.each([
        ["missing name", { ...VALID, name: "" }],
        ["whitespace-only name", { ...VALID, name: "   " }],
        ["missing email", { ...VALID, email: "" }],
        ["invalid email", { ...VALID, email: "not-an-email" }],
        ["missing phone", { ...VALID, phone: "" }],
        ["non-string fields", { ...VALID, name: 42 }],
    ])("returns 400 for %s", async (_, body) => {
        const res = await call(mockReq(body))
        expect(res.statusCode).toBe(400)
        expect(res.body).toEqual({ error: "Name, valid email and phone are required." })
        expect(mocks.send).not.toHaveBeenCalled()
    })

    it.each([
        ["no body", undefined],
        ["a string body", "name=Jane"],
    ])("returns 400 for %s", async (_, body) => {
        const res = await call(mockReq(body))
        expect(res.statusCode).toBe(400)
    })

    it("accepts a missing message", async () => {
        const { message: _, ...noMessage } = VALID
        const res = await call(mockReq(noMessage))
        expect(res.statusCode).toBe(200)
        expect(sentEmail().text).toContain("(no message)")
        expect(sentEmail().html).toContain("No message left.")
    })
})

describe("sending", () => {
    it("sends via Resend with the default addresses and returns 200", async () => {
        const res = await call(mockReq(VALID))
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({ ok: true })
        expect(mocks.resendKeys).toEqual(["re_test_key"])

        const email = sentEmail()
        expect(email.from).toBe("FT Services Website <website@ftserviceshayes.com>")
        expect(email.to).toBe("mike@ftserviceshayes.com")
        expect(email.replyTo).toBe('"Jane Tester" <jane@example.com>')
        expect(email.subject).toBe("New website enquiry from Jane Tester")
        expect(email.text).toBe(
            "Name: Jane Tester\nEmail: jane@example.com\nPhone: 07000 000000\n\n" +
                VALID.message,
        )
        expect(email.html).toContain("Jane Tester wants a quote")
        expect(email.html).toContain(VALID.message)
    })

    it("uses INQUIRY_TO and INQUIRY_FROM when set", async () => {
        vi.stubEnv("INQUIRY_TO", "someone@example.com")
        vi.stubEnv("INQUIRY_FROM", "Test <test@ftserviceshayes.com>")
        await call(mockReq(VALID))
        const email = sentEmail()
        expect(email.to).toBe("someone@example.com")
        expect(email.from).toBe("Test <test@ftserviceshayes.com>")
    })

    it("trims fields", async () => {
        await call(mockReq({ ...VALID, name: "  Jane Tester  ", email: " jane@example.com " }))
        expect(sentEmail().replyTo).toBe('"Jane Tester" <jane@example.com>')
    })

    it("clamps field lengths (name 200, message 5000)", async () => {
        await call(mockReq({ ...VALID, name: "N".repeat(300), message: "M".repeat(6000) }))
        const { subject, text } = sentEmail()
        expect(subject).toBe(`New website enquiry from ${"N".repeat(200)}`)
        expect(text).toContain("M".repeat(5000))
        expect(text).not.toContain("M".repeat(5001))
    })

    it("HTML-escapes user input in the email body", async () => {
        await call(
            mockReq({
                ...VALID,
                name: `<img src=x onerror="alert(1)">`,
                message: "<script>alert('hi')</script>\nline two",
            }),
        )
        const { html } = sentEmail()
        expect(html).not.toContain("<script>")
        expect(html).not.toContain("<img src=x")
        expect(html).toContain("&lt;script&gt;alert(&#39;hi&#39;)&lt;/script&gt;<br>line two")
        expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
    })

    it("strips CR/LF and quotes from header fields to prevent header injection", async () => {
        await call(mockReq({ ...VALID, name: 'Jane\r\nBcc: evil@example.com "x' }))
        const { subject, replyTo } = sentEmail()
        expect(subject).not.toMatch(/[\r\n]/)
        expect(subject).toBe('New website enquiry from Jane  Bcc: evil@example.com "x')
        expect(replyTo).not.toMatch(/[\r\n]/)
        expect(replyTo).toBe('"JaneBcc: evil@example.com x" <jane@example.com>')
    })
})

describe("send failures", () => {
    it("returns 500 when Resend returns an error", async () => {
        mocks.send.mockResolvedValue({
            data: null,
            error: { name: "validation_error", message: "API key is invalid", statusCode: 401 },
        })
        const res = await call(mockReq(VALID))
        expect(res.statusCode).toBe(500)
        expect(res.body).toEqual({ error: "Could not send your enquiry." })
    })

    it("returns 500 without leaking details when Resend throws", async () => {
        mocks.send.mockRejectedValue(new Error("socket hang up at internal/secret/path.js"))
        const res = await call(mockReq(VALID))
        expect(res.statusCode).toBe(500)
        expect(JSON.stringify(res.body)).not.toContain("secret")
    })

    it("returns 500 without calling Resend when RESEND_API_KEY is missing", async () => {
        vi.stubEnv("RESEND_API_KEY", "")
        const res = await call(mockReq(VALID))
        expect(res.statusCode).toBe(500)
        expect(mocks.send).not.toHaveBeenCalled()
    })
})

describe("honeypot", () => {
    it("pretends to succeed without sending when the website field is filled", async () => {
        const res = await call(mockReq({ ...VALID, website: "https://spam.example" }))
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({ ok: true })
        expect(mocks.send).not.toHaveBeenCalled()
    })

    it("sends normally when the website field is empty", async () => {
        const res = await call(mockReq({ ...VALID, website: "" }))
        expect(res.statusCode).toBe(200)
        expect(mocks.send).toHaveBeenCalledOnce()
    })

    it("does not count honeypot hits against the rate limit", async () => {
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example")
        vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
        await call(mockReq({ ...VALID, website: "spam" }))
        expect(mocks.limit).not.toHaveBeenCalled()
    })
})

describe("rate limiting", () => {
    const withUpstash = () => {
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example")
        vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    }

    it("is skipped when Upstash env vars are not set", async () => {
        const res = await call(mockReq(VALID))
        expect(res.statusCode).toBe(200)
        expect(mocks.ratelimitOptions).toHaveLength(0)
        expect(mocks.limit).not.toHaveBeenCalled()
    })

    it("allows 5 per hour, keyed by IP", async () => {
        withUpstash()
        await call(mockReq(VALID, { headers: { "x-real-ip": "203.0.113.7" } }))
        expect(mocks.ratelimitOptions[0]).toMatchObject({
            limiter: { tokens: 5, window: "1 h" },
            prefix: "ratelimit:inquiry",
        })
        expect(mocks.limit).toHaveBeenCalledWith("203.0.113.7")
        expect(mocks.send).toHaveBeenCalledOnce()
    })

    it("falls back to the first x-forwarded-for address", async () => {
        withUpstash()
        await call(mockReq(VALID, { headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" } }))
        expect(mocks.limit).toHaveBeenCalledWith("198.51.100.1")
    })

    it("returns 429 with Retry-After and does not send when over the limit", async () => {
        withUpstash()
        mocks.limit.mockResolvedValue({ success: false })
        const res = await call(mockReq(VALID, { headers: { "x-real-ip": "203.0.113.7" } }))
        expect(res.statusCode).toBe(429)
        expect(res.headers["Retry-After"]).toBe("3600")
        expect(res.body).toEqual({ error: "Too many enquiries. Please try again later." })
        expect(mocks.send).not.toHaveBeenCalled()
    })

    it("does not count invalid submissions against the limit", async () => {
        withUpstash()
        await call(mockReq({ ...VALID, email: "nope" }))
        expect(mocks.limit).not.toHaveBeenCalled()
    })

    it("fails open and still sends when Upstash is unreachable", async () => {
        withUpstash()
        mocks.limit.mockRejectedValue(new Error("fetch failed"))
        const res = await call(mockReq(VALID))
        expect(res.statusCode).toBe(200)
        expect(mocks.send).toHaveBeenCalledOnce()
    })
})
