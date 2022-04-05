import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("changes", () => {
    it("only emits non-equal elements", async () => {
      const stream = Stream(1, 2, 3, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .changes()
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((as) =>
          as
            .reduce(List.empty<number>(), (list, n) =>
              list.isEmpty() || list.unsafeFirst() !== n ? list.prepend(n) : list
            )
            .reverse()
            .toArray()
        )
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })
  })

  describe("changesWithEffect", () => {
    it("only emits non-equal elements", async () => {
      const stream = Stream(1, 2, 3, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .changesWithEffect((l, r) => Effect.succeed(l === r))
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((as) =>
          as
            .reduce(List.empty<number>(), (list, n) =>
              list.isEmpty() || list.unsafeFirst() !== n ? list.prepend(n) : list
            )
            .reverse()
            .toArray()
        )
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })
  })
})
