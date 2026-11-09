import { defineConfig, devices } from "@playwright/test"

const PORT = 4173
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`

// WebKit needs system libraries some distros lack (e.g. Fedora has no libicu 74).
// Set SKIP_WEBKIT=1 to run everything else locally; CI runs all projects.
const skipWebkit = !!process.env.SKIP_WEBKIT

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: { baseURL, trace: "on-first-retry" },
    // Test the production bundle, not the dev server.
    webServer: process.env.BASE_URL
        ? undefined
        : {
              command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
              url: baseURL,
              reuseExistingServer: !process.env.CI,
              timeout: 120_000,
          },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            testIgnore: /mobile\.spec\.ts/,
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: /mobile\.spec\.ts/,
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            testIgnore: /mobile\.spec\.ts/,
        },
        {
            name: "mobile-chrome",
            use: { ...devices["Pixel 7"] },
            testMatch: /(mobile|quote-form|accessibility)\.spec\.ts/,
        },
        {
            name: "mobile-safari",
            use: { ...devices["iPhone 14"] },
            testMatch: /(mobile|quote-form)\.spec\.ts/,
        },
    ].filter((p) => !(skipWebkit && ["webkit", "mobile-safari"].includes(p.name))),
})
