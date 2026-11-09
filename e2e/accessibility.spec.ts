import AxeBuilder from "@axe-core/playwright"
import { test, expect, ROUTES } from "./fixtures"

test.describe("axe scan", () => {
    for (const { path } of [...ROUTES, { path: "/not-a-page" }]) {
        test(`${path} has no serious or critical violations`, async ({ page }) => {
            await page.goto(path)
            // Reveal-on-scroll content can sit at opacity 0 and confuse contrast checks.
            await page.addStyleTag({
                content: "*{animation:none!important;transition:none!important}",
            })
            const { violations } = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa"])
                // Tracked separately below until the brand palette is reviewed.
                .disableRules(["color-contrast"])
                .analyze()
            const blocking = violations.filter((v) =>
                ["serious", "critical"].includes(v.impact ?? ""),
            )
            expect(
                blocking.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
            ).toEqual([])
        })
    }
})

// Known issue (see todo.md): white on brand orange (#F56300) is 3.14:1 and several
// grey labels are 2.4-4.5:1; WCAG AA needs 4.5:1 for normal text. Remove `fixme`
// once the palette is adjusted so this guards against regressions.
test.describe("colour contrast", () => {
    for (const { path } of ROUTES) {
        test(`${path} meets AA contrast`, async ({ page }) => {
            test.fixme(true, "brand orange / grey text below 4.5:1")
            await page.goto(path)
            await page.addStyleTag({
                content: "*{animation:none!important;transition:none!important}",
            })
            const { violations } = await new AxeBuilder({ page })
                .withRules(["color-contrast"])
                .analyze()
            expect(violations).toEqual([])
        })
    }
})

test.describe("keyboard", () => {
    test("form can be completed and submitted with the keyboard", async ({ page, inquiry }, testInfo) => {
        test.skip(!!testInfo.project.use.isMobile, "no keyboard on touch devices")
        await page.goto("/contact")
        await page.getByLabel("Name").first().focus()
        await page.keyboard.type("Jane Tester")
        await page.keyboard.press("Tab")
        await page.keyboard.type("jane@example.com")
        await page.keyboard.press("Tab")
        await page.keyboard.type("07000 000000")
        await page.keyboard.press("Tab")
        await page.keyboard.type("Hello")
        await page.keyboard.press("Tab")
        await page.keyboard.press("Enter")
        await expect(page.getByRole("status")).toBeVisible()
        expect(inquiry.requests).toHaveLength(1)
    })

    test("pressing Enter in a field submits the form", async ({ page, inquiry }, testInfo) => {
        test.skip(!!testInfo.project.use.isMobile, "no keyboard on touch devices")
        await page.goto("/contact")
        const form = page.locator("form.quote-form").first()
        await form.getByLabel("Name").fill("Jane")
        await form.getByLabel("Work email").fill("jane@example.com")
        await form.getByLabel("Phone").fill("07000 000000")
        await form.getByLabel("Phone").press("Enter")
        await expect(page.getByRole("status")).toBeVisible()
        expect(inquiry.requests).toHaveLength(1)
    })
})
