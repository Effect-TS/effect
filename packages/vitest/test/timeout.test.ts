import { afterAll, assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"

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

describe("anonymous it.layer timeout finalizers", { concurrent: false }, () => {
  const events: Array<string> = []
  const pendingReleases: Array<Promise<void>> = []
  let signal: AbortSignal | undefined

  // Drain real timers even if an interrupted layer close abandons its finalizer.
  afterAll(() => Promise.all(pendingReleases))

  const resource = (name: string) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        events.push(`${name}:acquired`)
      }),
      () =>
        Effect.gen(function*() {
          events.push(`${name}:release:start`)
          // TestClock cannot drive a finalizer after the test has timed out.
          yield* Effect.promise(() => {
            const pending = new Promise<void>((resolve) => setTimeout(resolve, 250))
            pendingReleases.push(pending)
            return pending
          })
          events.push(`${name}:release:end`)
        })
    )

  it.layer(Layer.effectDiscard(resource("layer")))((it) => {
    it.effect.fails("times out in the last test using the layer", (ctx) =>
      Effect.gen(function*() {
        signal = ctx.signal
        yield* resource("test")
        return yield* Effect.never
      }), { timeout: 75 })
  })

  it("awaits both test and layer finalizers before starting the next test", () => {
    events.push("next:start")
    assert.isTrue(signal?.aborted)
    assert.deepStrictEqual(events, [
      "layer:acquired",
      "test:acquired",
      "test:release:start",
      "test:release:end",
      "layer:release:start",
      "layer:release:end",
      "next:start"
    ])
  })
})
