import type { Service1 } from "@effect/core/test/io/Layer/test-utils"
import { acquire1, makeLayer1, makeRef, release1 } from "@effect/core/test/io/Layer/test-utils"

describe.concurrent("Layer", () => {
  describe.concurrent("memoization", () => {
    it("memoizes acquisition of resources", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("memoized", ({ ref }) => makeLayer1(ref).memoize)
        .tap(({ memoized }) =>
          Effect.scoped(
            memoized.flatMap((layer) =>
              Effect.environment<Service1>()
                .provideLayer(layer)
                .flatMap(() => Effect.environment<Service1>().provideLayer(layer))
            )
          )
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(acquire1, release1))
    })

    it("fiberRef changes are memoized", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(0))
        const tag = Tag<number>()
        const layer1 = Layer.scopedDiscard(fiberRef.locallyScoped(1))
        const layer2 = Layer.fromEffect(tag, fiberRef.get)
        const layer3 = layer1 + (layer1 >> layer2)
        const env = $(layer3.build)
        assert.equal(env.get(tag), 1)
      }).scoped.unsafeRunPromise())
  })
})
