import { afterAll, assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"

const pendingReleases: Array<Promise<void>> = []

// Drain the real timers even when a broken adapter abandons a finalizer.
afterAll(() => Promise.all(pendingReleases))

// The release takes real time: the TestClock is not advanced once a test has timed out.
const resource = (events: Array<string>, name: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      events.push(`${name}:acquired`)
    }),
    () =>
      Effect.promise(() => {
        events.push(`${name}:release:start`)
        const pending = new Promise<void>((resolve) =>
          setTimeout(() => {
            events.push(`${name}:release:end`)
            resolve()
          }, 250)
        )
        pendingReleases.push(pending)
        return pending
      })
  )

for (const mode of ["effect", "live"] as const) {
  describe(`it.${mode} timeout finalizers`, { concurrent: false }, () => {
    const events: Array<string> = []
    let signal: AbortSignal | undefined

    it[mode].fails("times out while holding a resource", (ctx) =>
      Effect.gen(function*() {
        signal = ctx.signal
        yield* resource(events, "test")
        return yield* Effect.never
      }), { timeout: 75 })

    it("awaits the finalizer before starting the next test", () => {
      events.push("next:start")
      assert.isTrue(signal?.aborted)
      assert.deepStrictEqual(events, ["test:acquired", "test:release:start", "test:release:end", "next:start"])
    })
  })
}

describe("it.layer timeout finalizers", { concurrent: false }, () => {
  const events: Array<string> = []
  let signal: AbortSignal | undefined

  it.layer(Layer.effectDiscard(resource(events, "layer")))((it) => {
    it.effect.fails("times out in the last test using the layer", (ctx) =>
      Effect.gen(function*() {
        signal = ctx.signal
        yield* resource(events, "test")
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
