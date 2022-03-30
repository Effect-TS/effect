import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { waitForSize } from "./test-utils"

describe("Queue", () => {
  describe("sliding", () => {
    it("with offer", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .bind("v1", ({ queue }) => queue.offer(2))
        .bind("v2", ({ queue }) => queue.offer(3))
        .bind("rest", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const { rest, v1, v2 } = await program.unsafeRunPromise()

      expect(rest).toEqual([2, 3])
      expect(v1).toBe(true)
      expect(v2).toBe(true)
    })

    it("with offerAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bind("value", ({ queue }) => queue.offerAll(List(1, 2, 3)))
        .bind("size", ({ queue }) => queue.size)

      const { size, value } = await program.unsafeRunPromise()

      expect(value).toBe(true)
      expect(size).toBe(2)
    })

    it("with enough capacity", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(100))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .tap(({ queue }) => queue.offer(3))
        .bind("rest", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const { rest } = await program.unsafeRunPromise()

      expect(rest).toEqual([1, 2, 3])
    })

    it("with offerAll and takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bind("value", ({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("result", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual([5, 6])
      expect(value).toBe(true)
    })

    it("with pending taker", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bindValue("iter", () => List.range(1, 5))
        .tap(({ queue }) => queue.take.fork())
        .tap(({ queue }) => waitForSize(queue, -1))
        .bind("oa", ({ iter, queue }) => queue.offerAll(iter))
        .bind("taken", ({ queue }) => queue.take)

      const { oa, taken } = await program.unsafeRunPromise()

      expect(taken).toBe(3)
      expect(oa).toBe(true)
    })

    it("check offerAll returns true", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(5))
        .bindValue("iter", () => List.range(1, 4))
        .flatMap(({ iter, queue }) => queue.offerAll(iter))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
