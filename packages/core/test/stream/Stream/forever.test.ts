import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("forever", () => {
    it("forever", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream(1)
            .forever()
            .runForEachWhile(() =>
              ref.modify((sum) => Tuple(sum >= 9 ? false : true, sum + 1))
            )
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })
  })
})
