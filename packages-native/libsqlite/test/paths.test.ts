import { describe, expect, it } from "vitest"
import { getLibSqlitePathSync } from "../src/index"

describe("platform-specific paths", () => {
  it("darwin-x86_64 ends with .dylib", () => {
    const p = getLibSqlitePathSync("darwin-x86_64")
    expect(p.endsWith("libsqlite3.dylib")).toBe(true)
  })

  it("linux-x86_64 ends with .so", () => {
    const p = getLibSqlitePathSync("linux-x86_64")
    expect(p.endsWith("libsqlite3.so")).toBe(true)
  })
})
