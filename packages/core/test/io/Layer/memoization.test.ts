import { Effect } from "../../../src/io/Effect"
import type { HasService1 } from "./test-utils"
import { acquire1, makeLayer1, makeRef, release1 } from "./test-utils"

describe("Layer", () => {
  describe("memoization", () => {
    it("memoizes acquisition of resources", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("memoized", ({ ref }) => makeLayer1(ref).memoize())
        .tap(({ memoized }) =>
          Effect.scoped(
            memoized.flatMap((layer) =>
              Effect.environment<HasService1>()
                .provideLayer(layer)
                .flatMap(() => Effect.environment<HasService1>().provideLayer(layer))
            )
          )
        )
        .flatMap(({ ref }) => ref.get.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([acquire1, release1])
    })
  })
})
