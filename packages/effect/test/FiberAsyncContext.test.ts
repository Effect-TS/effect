import { afterEach, assert, describe, it, vi } from "@effect/vitest"
import type * as Effect from "effect/Effect"

// These tests replace `AsyncResource` and reload modules, so they run
// sequentially in their own file.
describe("Fiber async context", { concurrent: false }, () => {
  // Models workerd, where entering a resource captured by another request
  // throws before the callback runs.
  const load = async () => {
    const log: Array<string> = []
    const state = { rejectEntry: false }
    class AsyncResource {
      runInAsyncScope<This, Arg, R>(fn: (this: This, arg: Arg) => R, thisArg: This, arg: Arg): R {
        if (state.rejectEntry) {
          log.push("rejected")
          throw new Error(
            "Cannot call this AsyncLocalStorage bound function outside of the request in which it was created."
          )
        }
        log.push("entered")
        return fn.call(thisArg, arg)
      }
      emitDestroy() {
        log.push("destroyed")
      }
    }
    const getBuiltinModule = process.getBuiltinModule
    vi.spyOn(process, "getBuiltinModule").mockImplementation(
      ((id: string) => id === "node:async_hooks" ? { AsyncResource } : getBuiltinModule(id)) as typeof getBuiltinModule
    )
    vi.resetModules()
    const { Effect: E, Exit } = await import("effect")
    return { E, Exit, log, state }
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("resumes in the current context when the captured context cannot be entered", async () => {
    const { E, Exit, log, state } = await load()
    let wake: ((effect: Effect.Effect<void>) => void) | undefined
    let runs = 0
    const fiber = E.runFork(
      E.callback<void>((resume) => {
        wake = resume
      }).pipe(E.andThen(E.sync(() => ++runs)))
    )
    log.length = 0

    state.rejectEntry = true
    wake!(E.void)

    assert.deepStrictEqual(fiber.pollUnsafe(), Exit.succeed(1))
    assert.strictEqual(runs, 1)
    assert.deepStrictEqual(log, ["rejected", "destroyed"])
  })

  it("propagates an error raised after entering the captured context", async () => {
    const { E, log } = await load()
    let wake: ((effect: Effect.Effect<void>) => void) | undefined
    const fiber = E.runFork(E.callback<void>((resume) => {
      wake = resume
    }))
    let observerCalls = 0
    fiber.addObserver(() => {
      observerCalls++
      throw new Error("boom")
    })
    log.length = 0

    assert.throws(() => wake!(E.void), "boom")

    assert.strictEqual(observerCalls, 1)
    assert.deepStrictEqual(log, ["entered", "destroyed"])
  })
})
