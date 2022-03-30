import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { waitForSize } from "./test-utils"

describe("Queue", () => {
  describe("offerAll", () => {
    it("with takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .bindValue("orders", () => List.range(1, 11))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .tap(({ queue }) => waitForSize(queue, 10))
        .bind("result", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const { orders, result } = await program.unsafeRunPromise()

      expect(result).toEqual(orders.toArray())
    })

    it("with takeAll and back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders", () => List.range(1, 4))
        .bind("fiber", ({ orders, queue }) => queue.offerAll(orders).fork())
        .bind("size", ({ queue }) => waitForSize(queue, 3))
        .bind("result", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .tap(({ fiber }) => fiber.interrupt())

      const { result, size } = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2])
      expect(size).toEqual(3)
    })

    it("with takeAll and back pressure + interruption", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders1", () => List.range(1, 3))
        .bindValue("orders2", () => List.range(3, 5))
        .tap(({ orders1, queue }) => queue.offerAll(orders1))
        .bind("fiber", ({ orders2, queue }) => queue.offerAll(orders2).fork())
        .tap(({ queue }) => waitForSize(queue, 4))
        .tap(({ fiber }) => fiber.interrupt())
        .bind("v1", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .bind("v2", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const { orders1, v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual(orders1.toArray())
      expect(v2).toEqual([])
    })

    it("with takeAll and back pressure, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(64))
        .bindValue("orders", () => List.range(1, 129))
        .bind("fiber", ({ orders, queue }) => queue.offerAll(orders).fork())
        .tap(({ queue }) => waitForSize(queue, 128))
        .bind("result", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .tap(({ fiber }) => fiber.interrupt())

      const { result } = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 65).toArray())
    })

    it("with pending takers", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(50))
        .bindValue("orders", () => List.range(1, 101))
        .bind("takers", ({ orders, queue }) =>
          Effect.forkAll(List.repeat(queue.take, 100))
        )
        .tap(({ queue }) => waitForSize(queue, -100))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .bind("result", ({ takers }) => takers.join().map((chunk) => chunk.toArray()))
        .bind("size", ({ queue }) => queue.size)

      const { orders, result, size } = await program.unsafeRunPromise()

      expect(result).toEqual(orders.toArray())
      expect(size).toBe(0)
    })

    it("with pending takers, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(256))
        .bindValue("orders", () => List.range(1, 129))
        .bind("takers", ({ queue }) => Effect.forkAll(List.repeat(queue.take, 64)))
        .tap(({ queue }) => waitForSize(queue, -64))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .bind("result", ({ takers }) => takers.join().map((chunk) => chunk.toArray()))
        .bind("size", ({ queue }) => queue.size)
        .bindValue("values", ({ orders }) => orders.take(64).toArray())

      const { result, size, values } = await program.unsafeRunPromise()

      expect(result).toEqual(values)
      expect(size).toBe(64)
    })

    it("with pending takers, check ordering of taker resolution", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(200))
        .bindValue("values", () => List.range(1, 101))
        .bind("takers", ({ queue }) => Effect.forkAll(List.repeat(queue.take, 100)))
        .tap(({ queue }) => waitForSize(queue, -100))
        .bind("fiber", ({ queue }) => Effect.forkAll(List.repeat(queue.take, 100)))
        .tap(({ queue }) => waitForSize(queue, -200))
        .tap(({ queue, values }) => queue.offerAll(values))
        .bind("result", ({ takers }) => takers.join().map((chunk) => chunk.toArray()))
        .bind("size", ({ queue }) => queue.size)
        .tap(({ fiber }) => fiber.interrupt())

      const { result, size, values } = await program.unsafeRunPromise()

      expect(result).toEqual(values.toArray())
      expect(size).toBe(-100)
    })

    it("with take and back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders", () => List.range(1, 4))
        .tap(({ orders, queue }) => queue.offerAll(orders).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .bind("v3", ({ queue }) => queue.take)

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toBe(1)
      expect(v2).toBe(2)
      expect(v3).toBe(3)
    })

    it("multiple with back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders1", () => List.range(1, 4))
        .bindValue("orders2", () => List.range(4, 6))
        .tap(({ orders1, queue }) => queue.offerAll(orders1).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .tap(({ orders2, queue }) => queue.offerAll(orders2).fork())
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .bind("v3", ({ queue }) => queue.take)
        .bind("v4", ({ queue }) => queue.take)
        .bind("v5", ({ queue }) => queue.take)

      const { v1, v2, v3, v4, v5 } = await program.unsafeRunPromise()

      expect(v1).toBe(1)
      expect(v2).toBe(2)
      expect(v3).toBe(3)
      expect(v4).toBe(4)
      expect(v5).toBe(5)
    })

    it("with takeAll, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(1000))
        .bindValue("orders", () => List.range(2, 1001))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .tap(({ queue }) => waitForSize(queue, 1000))
        .flatMap(({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 1001).toArray())
    })

    it("combination of offer, offerAll, take, takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(32))
        .bindValue("orders", () => List.range(3, 36))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .tap(({ orders, queue }) => queue.offerAll(orders).fork())
        .tap(({ queue }) => waitForSize(queue, 35))
        .bind("v", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .bind("v3", ({ queue }) => queue.take)

      const { v, v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v).toEqual(List.range(1, 33).toArray())
      expect(v1).toBe(33)
      expect(v2).toBe(34)
      expect(v3).toBe(35)
    })
  })
})
