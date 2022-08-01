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
  })
})
