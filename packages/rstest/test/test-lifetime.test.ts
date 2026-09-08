import { assert, describe, it, layer } from "@effect/rstest"
import { Effect, Layer } from "effect"

describe.sequential("test finalizers", () => {
  const events: Array<string> = []
  const resource = Layer.effectDiscard(Effect.acquireRelease(
    Effect.void,
    () => Effect.sync(() => events.push("layer released"))
  ))

  layer(resource, { excludeTestServices: true })("layer", (it) => {
    it.effect.fails("waits for cleanup after timeout", () =>
      Effect.gen(function*() {
        yield* Effect.acquireRelease(
          Effect.sync(() => events.push("acquired")),
          () => Effect.sleep(100).pipe(Effect.andThen(Effect.sync(() => events.push("released"))))
        )
        return yield* Effect.never
      }), 10)

    it.effect("finishes cleanup before the next test", () =>
      Effect.sync(() => assert.deepStrictEqual(events, ["acquired", "released"])))
  })

  it.effect("finishes cleanup before releasing the layer", () =>
    Effect.sync(() => assert.deepStrictEqual(events, ["acquired", "released", "layer released"])))
})
