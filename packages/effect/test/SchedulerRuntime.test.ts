import { afterEach, assert, describe, it, vi } from "@effect/vitest"
import * as Scheduler from "effect/Scheduler"

// These tests stub globals and reload modules, so they run sequentially in
// their own file.
describe("MixedScheduler dispatcher sharing", { concurrent: false }, () => {
  // Runtime capabilities are detected when the module loads.
  const load = (setup: () => void) => {
    vi.resetModules()
    setup()
    return import("effect/Scheduler")
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("shares a dispatcher unless a custom setImmediate is passed", () => {
    const shared = new Scheduler.MixedScheduler()
    assert.strictEqual(shared.makeDispatcher(), shared.makeDispatcher())

    const custom = new Scheduler.MixedScheduler("async", (f) => {
      const timer = setTimeout(f, 0)
      return () => clearTimeout(timer)
    })
    assert.notStrictEqual(custom.makeDispatcher(), custom.makeDispatcher())
  })

  it("does not share a dispatcher without AsyncResource", async () => {
    const { MixedScheduler } = await load(() => {
      vi.spyOn(process, "getBuiltinModule").mockImplementation(() => undefined as any)
    })
    const scheduler = new MixedScheduler()
    assert.notStrictEqual(scheduler.makeDispatcher(), scheduler.makeDispatcher())
  })

  it("does not share a dispatcher and dispatches without timers on Cloudflare Workers", async () => {
    const { MixedScheduler } = await load(() => {
      vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" })
    })
    const scheduler = new MixedScheduler()
    assert.notStrictEqual(scheduler.makeDispatcher(), scheduler.makeDispatcher())

    const setImmediate = vi.spyOn(globalThis, "setImmediate")
    const setTimeout = vi.spyOn(globalThis, "setTimeout")
    await new Promise<void>((resolve) => scheduler.makeDispatcher().scheduleTask(resolve, 0))
    assert.strictEqual(setImmediate.mock.calls.length, 0)
    assert.strictEqual(setTimeout.mock.calls.length, 0)
  })
})
