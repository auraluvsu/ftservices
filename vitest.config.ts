import { defineConfig } from "vitest/config"

// Unit tests only. Playwright owns e2e/ (its *.spec.ts files would otherwise match).
export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        environment: "node",
    },
})
