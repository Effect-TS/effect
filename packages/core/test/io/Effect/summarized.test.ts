import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("summarized", () => {
    it("returns summary and value", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bindValue("increment", ({ counter }) => counter.updateAndGet((n) => n + 1))
        .flatMap(({ increment }) =>
          increment.summarized(increment, (start, end) => Tuple(start, end))
        )

      const {
        tuple: [
          {
            tuple: [start, end]
          },
          value
        ]
      } = await program.unsafeRunPromise()

      expect(start).toBe(1)
      expect(value).toBe(2)
      expect(end).toBe(3)
    })
  })
})
