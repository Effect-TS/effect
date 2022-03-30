import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import { waitForSize } from "./test-utils"

describe("Queue", () => {
  describe("backpressure", () => {
    it("offers are suspended by back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .tap(({ queue }) => queue.offer(1).repeatN(9))
        .bind("refSuspended", () => Ref.make(true))
        .bind("fiber", ({ queue, refSuspended }) =>
          (queue.offer(2) > refSuspended.set(false)).fork()
        )
        .tap(({ queue }) => waitForSize(queue, 11))
        .bind("isSuspended", ({ refSuspended }) => refSuspended.get)
        .tap(({ fiber }) => fiber.interrupt())

      const { isSuspended } = await program.unsafeRunPromise()

      expect(isSuspended).toBe(true)
    })

    it("back pressured offers are retrieved", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .bindValue("values", () => List.range(1, 11))
        .bind("fiber", ({ queue, values }) =>
          Effect.forkAll(values.map((n) => queue.offer(n)))
        )
        .tap(({ queue }) => waitForSize(queue, 10))
        .bind("output", () => Ref.make(List.empty<number>()))
        .tap(({ output, queue }) =>
          queue.take.flatMap((i) => output.update((list) => list.append(i))).repeatN(9)
        )
        .bind("list", ({ output }) => output.get)
        .tap(({ fiber }) => fiber.join())

      const { list, values } = await program.unsafeRunPromise()

      expect(list.toArray()).toEqual(values.toArray())
    })

    it("back-pressured offer completes after take", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(List(1, 2)))
        .bind("fiber", ({ queue }) => queue.offer(3).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .tap(({ fiber }) => fiber.join())

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(1)
      expect(v2).toBe(2)
    })

    it("back-pressured offer completes after takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(List(1, 2)))
        .bind("fiber", ({ queue }) => queue.offer(3).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .tap(({ fiber }) => fiber.join())

      const { v1 } = await program.unsafeRunPromise()

      expect(v1).toEqual([1, 2])
    })

    it("back-pressured offer completes after takeUpTo", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(List(1, 2)))
        .bind("fiber", ({ queue }) => queue.offer(3).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.takeUpTo(2).map((chunk) => chunk.toArray()))
        .tap(({ fiber }) => fiber.join())

      const { v1 } = await program.unsafeRunPromise()

      expect(v1).toEqual([1, 2])
    })

    it("back-pressured offerAll completes after takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(List(1, 2)))
        .bind("fiber", ({ queue }) => queue.offerAll(List(3, 4, 5)).fork())
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("v1", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .bind("v2", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .bind("v3", ({ queue }) => queue.takeAll.map((chunk) => chunk.toArray()))
        .tap(({ fiber }) => fiber.join())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual([1, 2])
      expect(v2).toEqual([3, 4])
      expect(v3).toEqual([5])
    })
  })
})
