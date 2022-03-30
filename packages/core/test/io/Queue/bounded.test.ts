import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"

describe("Queue", () => {
  describe("bounded", () => {
    it("check offerAll returns true", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => List.range(1, 4))
        .flatMap(({ iter, queue }) => queue.offerAll(iter))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
