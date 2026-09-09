import { afterAll, assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

for (const mode of ["effect", "live"] as const) {
  describe(`it.${mode} timeout finalizers`, { concurrent: false }, () => {
    const events: Array<string> = []
    let signal: AbortSignal | undefined
    let releaseFinished: Promise<void> | undefined

    // Drain cleanup even when the ordering assertion fails on a broken adapter.
    afterAll(() => releaseFinished)

    it[mode].fails("times out while holding a resource", (ctx) =>
      Effect.gen(function*() {
        signal = ctx.signal
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            events.push("acquired")
          }),
          () =>
            Effect.promise(() => {
              events.push("release:start")
              // A real timer is needed: it.effect's TestClock is not advanced during cleanup.
              releaseFinished = new Promise<void>((resolve) => {
                setTimeout(() => {
                  events.push("release:end")
                  resolve()
                }, 250)
              })
              return releaseFinished
            })
        )
        return yield* Effect.never
      }), { timeout: 75 })

    it("awaits the finalizer before starting the next test", () => {
      events.push("next:start")
      assert.isTrue(signal?.aborted)
      assert.deepStrictEqual(events, ["acquired", "release:start", "release:end", "next:start"])
    })
  })
}
