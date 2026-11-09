import { test, expect, ROUTES } from "./fixtures"

test.describe("mobile menu", () => {
    test("opens, navigates, and closes", async ({ page }) => {
        await page.goto("/")
        const menu = page.getByRole("navigation", { name: "Mobile navigation" })
        await expect(menu).toBeHidden()

        await page.getByRole("button", { name: "Open menu" }).click()
        await expect(menu).toBeVisible()
        await menu.getByRole("link", { name: /Contact$/ }).click()
        await expect(page).toHaveURL("/contact")
        await expect(menu).toBeHidden()
        await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden")
    })

    test("close button dismisses the menu and restores scrolling", async ({ page }) => {
        await page.goto("/")
        await page.getByRole("button", { name: "Open menu" }).click()
        await expect(page.locator("body")).toHaveCSS("overflow", "hidden")
        await page.getByRole("button", { name: "Close menu" }).click()
        await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden()
        await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden")
    })

    test("Used Forklifts group expands to diesel and electric", async ({ page }) => {
        await page.goto("/")
        await page.getByRole("button", { name: "Open menu" }).click()
        const menu = page.getByRole("navigation", { name: "Mobile navigation" })
        await menu.getByRole("button", { name: /Used Forklifts/ }).click()
        await menu.getByRole("link", { name: /Diesel forklifts/ }).click()
        await expect(page).toHaveURL("/diesel-forklifts")
    })
})

test.describe("mobile layout", () => {
    for (const { path } of ROUTES) {
        test(`${path} has no horizontal overflow`, async ({ page }) => {
            await page.goto(path)
            // On failure, name the elements sticking out so CI logs are actionable.
            const report = await page.evaluate(() => {
                const vw = document.documentElement.clientWidth
                const overflow = document.documentElement.scrollWidth - vw
                const offenders: string[] = []
                document.querySelectorAll("body *").forEach((el) => {
                    // These scroll or clip internally and can't widen the page.
                    if (el.closest(".spec-table-wrap, .leaflet-container, .mobile-menu")) return
                    const b = el.getBoundingClientRect()
                    if (b.width > 0 && b.right > vw + 1) {
                        const cls = (el as HTMLElement).className
                        offenders.push(`${el.tagName.toLowerCase()}.${cls} right=${Math.round(b.right)}`)
                    }
                })
                return { overflow, vw, offenders: offenders.slice(0, 10) }
            })
            expect(
                report.overflow,
                `viewport ${report.vw}px, page ${report.overflow}px too wide. Elements past the edge:\n${report.offenders.join("\n")}`,
            ).toBeLessThanOrEqual(0)
        })
    }

    test("floating quote button appears on inner pages and goes to contact", async ({ page }) => {
        await page.goto("/new-forklifts")
        await expect(page.locator("aside.sticky-quote")).toBeHidden()
        await page.getByRole("link", { name: "Get a quote" }).last().click()
        await expect(page).toHaveURL("/contact")
    })
})
