import { afterEach, describe, expect, it, vi } from "vitest"

const originalProcess = process

describe("platform detection", () => {
  afterEach(() => {
    vi.resetModules()
    // restore the real process
    // @ts-expect-error override
    globalThis.process = originalProcess
  })

  it("detects darwin-x86_64", async () => {
    vi.stubGlobal("process", {
      platform: "darwin",
      arch: "x64",
      env: {},
      report: { getReport: () => ({ header: { glibcVersionRuntime: undefined } }) }
    })
    vi.resetModules()
    const mod = await import("../src/index")
    expect(mod.pathToLibSqlite.endsWith("darwin-x86_64/libsqlite3.dylib")).toBe(true)
  })

  it("detects linux-x86_64 (glibc)", async () => {
    vi.stubGlobal("process", {
      platform: "linux",
      arch: "x64",
      env: {},
      report: { getReport: () => ({ header: { glibcVersionRuntime: "2.37" } }) }
    })
    vi.resetModules()
    const mod = await import("../src/index")
    expect(mod.pathToLibSqlite.endsWith("linux-x86_64/libsqlite3.so")).toBe(true)
  })

  it("throws on linux musl", async () => {
    vi.stubGlobal("process", {
      platform: "linux",
      arch: "x64",
      env: {},
      report: { getReport: () => JSON.stringify({ header: {}, sharedObjects: ["/lib/libc.musl-x86_64.so.1"] }) }
    })
    vi.resetModules()
    let err: unknown
    try {
      await import("../src/index")
    } catch (e) {
      err = e
    }
    expect(typeof err === "object" && err !== null && "message" in err).toBe(true)
    // @ts-expect-error narrow for check
    expect(String((err as any).message)).toContain("musl")
  })
})
