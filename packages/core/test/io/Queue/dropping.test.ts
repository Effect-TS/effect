import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { waitForSize } from "./test-utils"

describe("Queue", () => {
  describe("dropping", () => {
    it("with offerAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(4))
        .bindValue("iter", () => List.range(1, 6))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .flatMap(({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4])
    })

    it("with offerAll, check offer returns false", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(2))
        .bind("v1", ({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .tap(({ queue }) => queue.takeAll)

      const { v1 } = await program.unsafeRunPromise()

      expect(v1).toEqual(false)
    })

    it("with offerAll, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(128))
        .bindValue("iter", () => List.range(1, 257))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .flatMap(({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 129).toArray())
    })

    it("with pending taker", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(2))
        .bindValue("iter", () => List.range(1, 5))
        .bind("fiber", ({ queue }) => queue.take.fork())
        .tap(({ queue }) => waitForSize(queue, -1))
        .bind("oa", ({ iter, queue }) => queue.offerAll(iter))
        .bind("j", ({ fiber }) => fiber.join())

      const { j, oa } = await program.unsafeRunPromise()

      expect(j).toBe(1)
      expect(oa).toBe(false)
    })
  })
})
