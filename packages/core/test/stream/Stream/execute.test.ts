import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("execute", () => {
    it("should execute the specified effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .tap(({ ref }) => Stream.execute(ref.set(List(1))).runDrain())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1])
    })
  })
})
