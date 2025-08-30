import { getLibSqlitePathSync, pathToLibSqlite } from "@effect-native/libsqlite"
import { describe, expect, it } from "vitest"

describe("libsqlite root api", () => {
  it("exports a string path", () => {
    expect(typeof pathToLibSqlite).toBe("string")
    expect(pathToLibSqlite.length).toBeGreaterThan(0)
  })

  it("getLibSqlitePathSync returns a string path", () => {
    const p = getLibSqlitePathSync(undefined)
    expect(typeof p).toBe("string")
    expect(p.includes("libsqlite3")).toBe(true)
  })
})
