import { test, expect, fullForm, fillForm, VALID_ENQUIRY } from "./fixtures"

test.describe("full form (contact page)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/contact")
    })

    test("empty submit shows all three errors and sends nothing", async ({ page, inquiry }) => {
        const form = fullForm(page)
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await expect(form.getByText("Please enter your name.")).toBeVisible()
        await expect(form.getByText("Enter a valid email address.")).toBeVisible()
        await expect(form.getByText("Please enter your phone number.")).toBeVisible()
        await expect(form.getByLabel("Name")).toHaveAttribute("aria-invalid", "true")
        expect(inquiry.requests).toHaveLength(0)
    })

    test("rejects invalid emails and whitespace-only fields", async ({ page, inquiry }) => {
        const form = fullForm(page)
        await fillForm(form, { name: "   ", email: "a@b", phone: "   " })
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await expect(form.getByText("Please enter your name.")).toBeVisible()
        await expect(form.getByText("Enter a valid email address.")).toBeVisible()
        await expect(form.getByText("Please enter your phone number.")).toBeVisible()
        expect(inquiry.requests).toHaveLength(0)
    })

    test("errors clear once the fields are fixed", async ({ page }) => {
        const form = fullForm(page)
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await fillForm(form)
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await expect(page.getByRole("status")).toBeVisible()
        await expect(page.getByText("Please enter your name.")).toHaveCount(0)
    })

    test("valid submit posts the expected JSON and shows success", async ({ page, inquiry }) => {
        const form = fullForm(page)
        await fillForm(form)
        const request = page.waitForRequest("**/api/inquiry")
        await form.getByRole("button", { name: /Request a free quote/ }).click()

        const req = await request
        expect(req.method()).toBe("POST")
        expect(req.postDataJSON()).toEqual(VALID_ENQUIRY)
        await expect(page.getByRole("status")).toContainText("Thanks — we’ll be in touch.")
        expect(inquiry.requests).toHaveLength(1)
    })

    test("can send another enquiry after success", async ({ page }) => {
        const form = fullForm(page)
        await fillForm(form)
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await page.getByRole("button", { name: "Send another enquiry" }).click()
        await expect(fullForm(page)).toBeVisible()
        await expect(fullForm(page).getByLabel("Name")).toHaveValue("")
    })

    test("message is optional", async ({ page, inquiry }) => {
        const form = fullForm(page)
        await fillForm(form, { ...VALID_ENQUIRY, message: undefined })
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await expect(page.getByRole("status")).toBeVisible()
        expect(inquiry.requests[0]).toMatchObject({ name: VALID_ENQUIRY.name, message: "" })
    })

    test("button is disabled while sending and only one request goes out", async ({ page }) => {
        let calls = 0
        let release!: () => void
        const gate = new Promise<void>((r) => (release = r))
        await page.route("**/api/inquiry", async (route) => {
            calls++
            await gate
            await route.fulfill({ status: 200, json: { ok: true } })
        })
        const form = fullForm(page)
        await fillForm(form)
        const button = form.getByRole("button", { name: /Request a free quote/ })
        await button.click()
        const sending = form.getByRole("button", { name: /Sending/ })
        await expect(sending).toBeDisabled()
        await sending.click({ force: true }).catch(() => {})
        release()
        await expect(page.getByRole("status")).toBeVisible()
        expect(calls).toBe(1)
    })

    for (const status of [400, 500]) {
        test(`HTTP ${status} shows an alert, keeps the input, and retry works`, async ({ page }) => {
            let fail = true
            await page.route("**/api/inquiry", (route) =>
                fail
                    ? route.fulfill({ status, json: { error: "nope" } })
                    : route.fulfill({ status: 200, json: { ok: true } }),
            )
            const form = fullForm(page)
            await fillForm(form)
            await form.getByRole("button", { name: /Request a free quote/ }).click()

            const alert = form.getByRole("alert")
            await expect(alert).toContainText("something went wrong")
            await expect(alert).toContainText("mike@ftserviceshayes.com")
            await expect(form.getByLabel("Name")).toHaveValue(VALID_ENQUIRY.name)
            await expect(form.getByRole("button", { name: /Request a free quote/ })).toBeEnabled()

            fail = false
            await form.getByRole("button", { name: /Request a free quote/ }).click()
            await expect(page.getByRole("status")).toBeVisible()
        })
    }

    test("network failure shows the alert", async ({ page }) => {
        await page.route("**/api/inquiry", (route) => route.abort("failed"))
        const form = fullForm(page)
        await fillForm(form)
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await expect(form.getByRole("alert")).toContainText("something went wrong")
    })
})

test.describe("forms elsewhere", () => {
    test("home page contact band form submits", async ({ page, inquiry }) => {
        await page.goto("/")
        const form = fullForm(page)
        await form.scrollIntoViewIfNeeded()
        await fillForm(form)
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await expect(page.getByRole("status")).toBeVisible()
        expect(inquiry.requests).toHaveLength(1)
    })

    test("compact sticky form on inner pages submits without a message field", async ({
        page,
        inquiry,
    }, testInfo) => {
        test.skip(!!testInfo.project.use.isMobile, "sticky form is hidden on mobile")
        await page.goto("/new-forklifts")
        const form = page.locator("form.quote-form--compact")
        await expect(form.getByLabel("How can we help?")).toHaveCount(0)
        await fillForm(form, { ...VALID_ENQUIRY, message: undefined })
        await form.getByRole("button", { name: /Request a free quote/ }).click()
        await expect(page.getByRole("status").first()).toBeVisible()
        expect(inquiry.requests).toHaveLength(1)
    })

    test("two forms on one page have unique ids and working labels", async ({ page }) => {
        await page.goto("/")
        const ids = await page.locator("form.quote-form [id]").evaluateAll((els) =>
            els.map((e) => e.id),
        )
        expect(new Set(ids).size).toBe(ids.length)
        for (const form of await page.locator("form.quote-form").all()) {
            await expect(form.getByLabel("Name")).toBeVisible()
        }
    })
})
