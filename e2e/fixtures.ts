import { test as base, expect, type Page } from "@playwright/test"

/** Every route the site serves, with the h1 it should render. */
export const ROUTES = [
    { path: "/", h1: /Local Forklift Sales/ },
    { path: "/new-forklifts", h1: "New forklifts, matched to your operation." },
    { path: "/used-forklifts", h1: "Dependable used forklifts. Sensible value." },
    { path: "/forklift-services", h1: "Keep your forklifts working at their best." },
    { path: "/diesel-forklifts", h1: "Diesel forklifts for demanding work." },
    { path: "/electric-forklifts", h1: "Clean, capable electric forklifts." },
    { path: "/forklift-hire", h1: "The equipment you need, for as long as you need it." },
    { path: "/liugong-forklifts", h1: "Capable trucks. Straightforward local support." },
    { path: "/contact", h1: "Let’s get your operation moving." },
] as const

export const VALID_ENQUIRY = {
    name: "Jane Tester",
    email: "jane@example.com",
    phone: "07000 000000",
    message: "I need a quote for two electric trucks.",
}

/**
 * Block anything that isn't our own origin (map tiles, fonts) so tests are
 * hermetic and fast, and fail loudly if a test would hit the real endpoint.
 */
export const test = base.extend<{ inquiry: { requests: unknown[] } }>({
    page: async ({ page, baseURL }, use) => {
        await page.route("**/*", (route) => {
            const url = route.request().url()
            if (url.startsWith(baseURL!) || url.startsWith("data:")) return route.fallback()
            return route.abort()
        })
        await use(page)
    },
    // Default mock for the enquiry endpoint: records bodies, returns 200.
    inquiry: [async ({ page }, use) => {
        const state = { requests: [] as unknown[] }
        await page.route("**/api/inquiry", async (route) => {
            state.requests.push(route.request().postDataJSON())
            await route.fulfill({ status: 200, json: { ok: true } })
        })
        await use(state)
    }, { auto: true }],
})

export { expect }

/** First full (non-compact) enquiry form on the page. */
export const fullForm = (page: Page) =>
    page.locator("form.quote-form:not(.quote-form--compact)").first()

export async function fillForm(
    form: ReturnType<typeof fullForm>,
    data: Partial<typeof VALID_ENQUIRY> = VALID_ENQUIRY,
) {
    if (data.name !== undefined) await form.getByLabel("Name").fill(data.name)
    if (data.email !== undefined) await form.getByLabel("Work email").fill(data.email)
    if (data.phone !== undefined) await form.getByLabel("Phone").fill(data.phone)
    if (data.message !== undefined) {
        const box = form.getByLabel("How can we help?")
        if (await box.count()) await box.fill(data.message)
    }
}
