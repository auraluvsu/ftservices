import { test, expect } from "./fixtures"

test("contact page renders the Leaflet map with a marker and popup", async ({ page }) => {
    await page.goto("/contact")
    const map = page.locator(".location-map__canvas")
    await map.scrollIntoViewIfNeeded()
    await expect(map).toBeVisible()
    await expect(map).toHaveClass(/leaflet-container/)

    // Tile images are requested (and blocked by the fixture) from OSM only.
    await expect(map.locator(".leaflet-tile-pane img").first()).toBeAttached()
    await expect(map.locator(".leaflet-control-attribution")).toBeVisible()

    await map.locator(".leaflet-marker-icon").click()
    await expect(map.locator(".leaflet-popup")).toContainText("Unit 24 Adler Industrial Estate")
    await expect(map.locator(".leaflet-popup")).toContainText("UB3 1ST")
})

test("map zoom controls work", async ({ page }) => {
    await page.goto("/contact")
    const map = page.locator(".location-map__canvas")
    await map.scrollIntoViewIfNeeded()
    const before = await map.locator(".leaflet-tile-pane .leaflet-tile-container").count()
    await map.getByRole("button", { name: "Zoom in" }).click()
    await expect(map.getByRole("button", { name: "Zoom in" })).toBeVisible()
    expect(before).toBeGreaterThan(0)
})
