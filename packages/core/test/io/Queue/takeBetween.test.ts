import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"

describe("Queue", () => {
  describe("takeBetween", () => {
    it("returns immediately if there is enough elements", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .flatMap(({ queue }) => queue.takeBetween(2, 5).map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([10, 20, 30])
    })

    it("returns an empty list if boundaries are inverted", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .flatMap(({ queue }) => queue.takeBetween(5, 2))

      const result = await program.unsafeRunPromise()

      expect(result.isEmpty()).toBe(true)
    })

    it("returns an empty list if boundaries are negative", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .flatMap(({ queue }) => queue.takeBetween(-5, -2))

      const result = await program.unsafeRunPromise()

      expect(result.isEmpty()).toBe(true)
    })

    it("blocks until a required minimum of elements is collected", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bindValue("updater", ({ queue }) => queue.offer(10).forever())
        .bindValue("getter", ({ queue }) => queue.takeBetween(5, 10))
        .flatMap(({ getter, updater }) => getter.race(updater))

      const result = await program.unsafeRunPromise()

      expect(result.size).toBeGreaterThanOrEqual(5)
    })

    it("returns elements in the correct order", async () => {
      const as = [-10, -7, -4, -1, 5, 10]
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bind("fiber", ({ queue }) => Effect.forEach(as, (n) => queue.offer(n)).fork())
        .bind("bs", ({ queue }) =>
          queue.takeBetween(as.length, as.length).map((chunk) => chunk.toArray())
        )
        .tap(({ fiber }) => fiber.interrupt())

      const { bs } = await program.unsafeRunPromise()

      expect(bs).toEqual(as)
    })
  })
})
