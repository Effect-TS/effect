import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { waitForSize } from "./test-utils"

describe("Queue", () => {
  describe("takeAll", () => {
    it("returns all values from a non-empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .tap(({ queue }) => queue.offer(3))
        .flatMap(({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("returns all values from an empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .bind("v1", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual([])
      expect(v2).toEqual([])
    })

    it("does not return more than the queue size", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(4))
        .bindValue("values", () => List(1, 2, 3, 4))
        .tap(({ queue, values }) =>
          values
            .map((n) => queue.offer(n))
            .reduce(Effect.succeed(false), (acc, curr) => acc > curr)
        )
        .tap(({ queue }) => queue.offer(5).fork())
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("v1", ({ queue }) => queue.takeAll)
        .bind("v2", ({ queue }) => queue.take)

      const { v1, v2, values } = await program.unsafeRunPromise()

      expect(v1.toArray()).toEqual(values.toArray())
      expect(v2).toBe(5)
    })
  })
})
