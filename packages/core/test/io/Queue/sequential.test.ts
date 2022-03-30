import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"

describe("Queue", () => {
  describe("sequential", () => {
    it("sequential offer and take", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bind("o1", ({ queue }) => queue.offer(10))
        .bind("v1", ({ queue }) => queue.take)
        .bind("o2", ({ queue }) => queue.offer(20))
        .bind("v2", ({ queue }) => queue.take)

      const { o1, o2, v1, v2 } = await program.unsafeRunPromise()

      expect(o1).toBe(true)
      expect(v1).toBe(10)
      expect(o2).toBe(true)
      expect(v2).toBe(20)
    })

    it("sequential take and offer", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<string>(100))
        .bind("fiber", ({ queue }) =>
          queue.take.zipWith(queue.take, (a, b) => a + b).fork()
        )
        .tap(({ queue }) => queue.offer("don't ") > queue.offer("give up :D"))
        .flatMap(({ fiber }) => fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("don't give up :D")
    })
  })
})
