import * as DenoRuntime from "@effect/platform-deno/DenoRuntime"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { vi } from "vitest"

// These tests replace the Deno global, so they must not run concurrently.
describe("DenoRuntime", { concurrent: false }, () => {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    it(`keeps signal listeners through finalization after repeated ${signal}`, async () => {
      const listeners = { SIGINT: new Set<() => void>(), SIGTERM: new Set<() => void>() }
      const acquired = Promise.withResolvers<void>()
      const finalizerStarted = Promise.withResolvers<void>()
      const releaseFinalizer = Promise.withResolvers<void>()
      const exited = Promise.withResolvers<number>()
      let finalized = false
      const exit = vi.fn((code: number) => exited.resolve(code))
      vi.stubGlobal("Deno", {
        addSignalListener: (signal: keyof typeof listeners, listener: () => void) => listeners[signal].add(listener),
        removeSignalListener: (signal: keyof typeof listeners, listener: () => void) =>
          listeners[signal].delete(listener),
        exit
      })

      try {
        DenoRuntime.runMain(
          Effect.acquireRelease(
            Effect.sync(() => acquired.resolve()),
            () =>
              Effect.promise(async () => {
                finalizerStarted.resolve()
                await releaseFinalizer.promise
                finalized = true
              })
          ).pipe(Effect.andThen(Effect.never), Effect.scoped)
        )
        await acquired.promise
        for (const listener of listeners[signal]) listener()
        await finalizerStarted.promise

        const duringFinalization = [listeners.SIGINT.size, listeners.SIGTERM.size]
        for (const listener of listeners[signal]) listener()
        const afterRepeatedSignal = [listeners.SIGINT.size, listeners.SIGTERM.size]
        assert.isFalse(finalized)
        assert.strictEqual(exit.mock.calls.length, 0)

        releaseFinalizer.resolve()
        assert.strictEqual(await exited.promise, 130)
        assert.isTrue(finalized)
        assert.strictEqual(exit.mock.calls.length, 1)
        assert.deepStrictEqual([listeners.SIGINT.size, listeners.SIGTERM.size], [0, 0])
        assert.deepStrictEqual(duringFinalization, [1, 1])
        assert.deepStrictEqual(afterRepeatedSignal, [1, 1])
      } finally {
        releaseFinalizer.resolve()
        await exited.promise
        vi.unstubAllGlobals()
      }
    })
  }
})
