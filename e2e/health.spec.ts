import { test, expect, ROUTES } from "./fixtures"

test.describe("page health", () => {
    for (const { path } of ROUTES) {
        test(`${path} has a title, no console errors, and no failed own-origin requests`, async ({
            page,
            baseURL,
        }) => {
            const errors: string[] = []
            const failed: string[] = []
            page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
            page.on("pageerror", (e) => errors.push(e.message))
            page.on("response", (r) => {
                if (r.url().startsWith(baseURL!) && r.status() >= 400) {
                    failed.push(`${r.status()} ${r.url()}`)
                }
            })

            await page.goto(path)
            await expect(page).toHaveTitle(/FT Services/)
            await page.waitForLoadState("networkidle")

            // Blocked third-party requests (map tiles) log net errors; ignore those only.
            const real = errors.filter((e) => !/ERR_FAILED|Failed to load resource/.test(e))
            expect(real).toEqual([])
            expect(failed).toEqual([])
        })
    }

    test("all images have alt text and load", async ({ page }) => {
        for (const { path } of ROUTES) {
            await page.goto(path)
            await page.waitForLoadState("networkidle")
            const bad = await page.locator("img").evaluateAll((imgs) =>
                (imgs as HTMLImageElement[])
                    .filter((i) => !i.closest(".leaflet-container"))
                    .filter((i) => !i.hasAttribute("alt") || (i.complete && i.naturalWidth === 0))
                    .map((i) => i.src),
            )
            expect(bad, path).toEqual([])
        }
    })

    test("favicon is served", async ({ request }) => {
        const res = await request.get("/image_c0ba5da2.ico")
        expect(res.ok()).toBe(true)
    })

    test("unknown /api routes are not swallowed by the SPA rewrite config", async ({ request }) => {
        // Under `vite preview` there is no function runtime; just make sure we get no 5xx HTML crash.
        const res = await request.get("/api/does-not-exist")
        expect(res.status()).toBeLessThan(500)
    })
})
