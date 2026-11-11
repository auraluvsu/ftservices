import { test, expect, ROUTES } from "./fixtures"

test.describe("deep links", () => {
    for (const { path, h1 } of ROUTES) {
        test(`${path} loads directly and after a hard refresh`, async ({ page }) => {
            await page.goto(path)
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1)
            await page.reload()
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1)
        })
    }
})

test.describe("moved pages", () => {
    test("the old misspelled LiuGong URL lands on the new page", async ({ page }) => {
        await page.goto("/luigong-forklifts?ref=old#top")
        await expect(page).toHaveURL("/liugong-forklifts?ref=old#top")
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            "Capable trucks. Straightforward local support.",
        )
    })
})

test.describe("desktop navigation", () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(!!testInfo.project.use.isMobile, "desktop nav only")
    })

    test("main nav links navigate client-side and mark the active link", async ({ page }) => {
        await page.goto("/")
        const nav = page.getByRole("navigation", { name: "Main navigation" })
        // The window object survives client-side navigation but not a full load.
        await page.evaluate(() => ((window as any).__spa = true))

        for (const [name, path] of [
            ["New Forklifts", "/new-forklifts"],
            ["Forklift Hire", "/forklift-hire"],
            ["LiuGong Forklifts", "/liugong-forklifts"],
            ["Forklift Services", "/forklift-services"],
            ["Contact", "/contact"],
        ] as const) {
            await nav.getByRole("link", { name, exact: true }).click()
            await expect(page).toHaveURL(path)
            await expect(nav.getByRole("link", { name, exact: true })).toHaveClass(/active/)
        }
        expect(await page.evaluate(() => (window as any).__spa)).toBe(true)
    })

    test("Used Forklifts dropdown reaches diesel and electric pages", async ({ page }) => {
        await page.goto("/")
        const nav = page.getByRole("navigation", { name: "Main navigation" })
        await nav.getByRole("link", { name: "Used Forklifts", exact: true }).hover()
        await nav.getByRole("link", { name: /Diesel forklifts/ }).click()
        await expect(page).toHaveURL("/diesel-forklifts")
        // Parent stays highlighted on child pages.
        await expect(nav.getByRole("link", { name: "Used Forklifts", exact: true })).toHaveClass(
            /active/,
        )

        await nav.getByRole("link", { name: "Used Forklifts", exact: true }).hover()
        await nav.getByRole("link", { name: /Electric forklifts/ }).click()
        await expect(page).toHaveURL("/electric-forklifts")
    })

    test("logo returns home", async ({ page }) => {
        await page.goto("/contact")
        await page.getByRole("link", { name: "FT Services home" }).first().click()
        await expect(page).toHaveURL("/")
    })

    test("browser back/forward move through history", async ({ page }) => {
        await page.goto("/")
        const nav = page.getByRole("navigation", { name: "Main navigation" })
        await nav.getByRole("link", { name: "New Forklifts", exact: true }).click()
        await nav.getByRole("link", { name: "Contact", exact: true }).click()
        await expect(page).toHaveURL("/contact")

        await page.goBack()
        await expect(page).toHaveURL("/new-forklifts")
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            "New forklifts, matched to your operation.",
        )
        await page.goBack()
        await expect(page).toHaveURL("/")
        await page.goForward()
        await expect(page).toHaveURL("/new-forklifts")
    })

    test("navigating resets scroll to the top", async ({ page }) => {
        await page.goto("/")
        await page.evaluate(() => window.scrollTo(0, 1200))
        await page
            .getByRole("navigation", { name: "Main navigation" })
            .getByRole("link", { name: "Contact", exact: true })
            .click()
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    })

    test("header gains its scrolled state after scrolling", async ({ page }) => {
        await page.goto("/")
        const header = page.locator("header.header")
        await expect(header).not.toHaveClass(/header--scrolled/)
        await page.evaluate(() => window.scrollTo(0, 400))
        await expect(header).toHaveClass(/header--scrolled/)
    })
})

test.describe("footer", () => {
    test("is present on every page with the current year", async ({ page }) => {
        for (const { path } of ROUTES) {
            await page.goto(path)
            await expect(page.locator("footer")).toContainText(
                `© ${new Date().getFullYear()} FT Services`,
            )
        }
    })
})

test.describe("404", () => {
    for (const path of ["/nope", "/forklifts/new", "/contact/extra"]) {
        test(`${path} shows the not-found page`, async ({ page }) => {
            await page.goto(path)
            await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found")
            await expect(page).toHaveTitle(/Page not found/)
            // Site chrome is still there.
            await expect(page.locator("header.header")).toBeVisible()
            await expect(page.locator("footer")).toBeVisible()
        })
    }

    test("links lead back into the site and restore the title", async ({ page }) => {
        await page.goto("/missing")
        await page.getByRole("link", { name: /Back to home/ }).click()
        await expect(page).toHaveURL("/")
        await expect(page).toHaveTitle("FT Services | Hayes")

        await page.goto("/missing")
        await page.getByRole("link", { name: "Contact us" }).click()
        await expect(page).toHaveURL("/contact")
    })

    test("known pages never show the 404", async ({ page }) => {
        for (const { path } of ROUTES) {
            await page.goto(path)
            await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0)
        }
    })
})
