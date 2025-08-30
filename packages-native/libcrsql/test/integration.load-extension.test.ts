import { describe, it } from "@effect/vitest"

// Integration test is opt-in: set RUN_INTEGRATION=1 and install better-sqlite3
const run = process.env.RUN_INTEGRATION === "1"

describe.runIf(run)("integration: load extension with better-sqlite3", () => {
  it("loads extension", async () => {
    let Database: any
    try {
      Database = (await import("better-sqlite3")).default
    } catch {
      return
    }
    const { pathToCrSqliteExtension } = await import("../src/index.js")
    const db = new Database(":memory:")
    db.loadExtension(pathToCrSqliteExtension)
    // Simple query to ensure DB remains usable
    db.prepare("SELECT 1").get()
    db.close()
  })
})
