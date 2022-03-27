import { List } from "../../src/collection/immutable/List"
import { Duration } from "../../src/data/Duration"
import { Either } from "../../src/data/Either"
import { identity } from "../../src/data/Function"
import { Option } from "../../src/data/Option"
import { Cause } from "../../src/io/Cause"
import type { HasClock } from "../../src/io/Clock"
import { Clock } from "../../src/io/Clock"
import type { IO, RIO, UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import { Promise } from "../../src/io/Promise"
import type { XQueue } from "../../src/io/Queue"
import { Queue } from "../../src/io/Queue"
import { Ref } from "../../src/io/Ref"

function waitForValue<A>(ref: UIO<A>, value: A): RIO<HasClock, A> {
  return (ref < Clock.sleep(Duration(10))).repeatUntil((a) => value === a)
}

function waitForSize<RA, EA, RB, EB, A, B>(
  queue: XQueue<RA, EA, RB, EB, A, B>,
  size: number
): RIO<HasClock, number> {
  return waitForValue(queue.size, size)
}

describe("Queue", () => {
  it("handles falsy values", async () => {
    const program = Queue.unbounded<number>()
      .tap((queue) => queue.offer(0))
      .flatMap((queue) => queue.take())

    const result = await program.unsafeRunPromise()

    expect(result).toBe(0)
  })

  it("sequential offer and take", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.bounded<number>(100))
      .bind("o1", ({ queue }) => queue.offer(10))
      .bind("v1", ({ queue }) => queue.take())
      .bind("o2", ({ queue }) => queue.offer(20))
      .bind("v2", ({ queue }) => queue.take())

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
        queue
          .take()
          .zipWith(queue.take(), (a, b) => a + b)
          .fork()
      )
      .tap(({ queue }) => queue.offer("don't ") > queue.offer("give up :D"))
      .flatMap(({ fiber }) => fiber.join())

    const result = await program.unsafeRunPromise()

    expect(result).toBe("don't give up :D")
  })

  it("parallel takes and sequential offers", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.bounded<number>(100))
      .bind("fiber", ({ queue }) => Effect.forkAll(List.repeat(queue.take(), 10)))
      .bindValue("values", () => List.range(1, 11))
      .tap(({ queue, values }) =>
        values
          .map((n) => queue.offer(n))
          .reduce(Effect.succeed(false), (acc, curr) => acc > curr)
      )
      .bind("v", ({ fiber }) => fiber.join())

    const { v, values } = await program.unsafeRunPromise()

    expect(v.toArray()).toEqual(values.toArray())
  })

  it("parallel offers and sequential takes", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.bounded<number>(10))
      .bindValue("values", () => List.range(1, 11))
      .bind("fiber", ({ queue, values }) =>
        Effect.forkAll(values.map((n) => queue.offer(n)))
      )
      .tap(({ queue }) => waitForSize(queue, 10))
      .bind("output", () => Ref.make<List<number>>(List.empty()))
      .tap(({ output, queue }) =>
        queue
          .take()
          .flatMap((i) => output.update((list) => list.append(i)))
          .repeatN(9)
      )
      .bind("list", ({ output }) => output.get())
      .tap(({ fiber }) => fiber.join())

    const { list, values } = await program.unsafeRunPromise()

    expect(list.toArray()).toEqual(values.toArray())
  })

  it("offers are suspended by back pressure", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.bounded<number>(10))
      .tap(({ queue }) => queue.offer(1).repeatN(9))
      .bind("refSuspended", () => Ref.make(true))
      .bind("fiber", ({ queue, refSuspended }) =>
        (queue.offer(2) > refSuspended.set(false)).fork()
      )
      .tap(({ queue }) => waitForSize(queue, 11))
      .bind("isSuspended", ({ refSuspended }) => refSuspended.get())
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
        queue
          .take()
          .flatMap((i) => output.update((list) => list.append(i)))
          .repeatN(9)
      )
      .bind("list", ({ output }) => output.get())
      .tap(({ fiber }) => fiber.join())

    const { list, values } = await program.unsafeRunPromise()

    expect(list.toArray()).toEqual(values.toArray())
  })

  it("take interruption", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.bounded<number>(100))
      .bind("fiber", ({ queue }) => queue.take().fork())
      .tap(({ queue }) => waitForSize(queue, -1))
      .tap(({ fiber }) => fiber.interrupt())
      .flatMap(({ queue }) => queue.size)

    const result = await program.unsafeRunPromise()

    expect(result).toBe(0)
  })

  it("offer interruption", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.bounded<number>(2))
      .tap(({ queue }) => queue.offer(1))
      .tap(({ queue }) => queue.offer(1))
      .bind("fiber", ({ queue }) => queue.offer(1).fork())
      .tap(({ queue }) => waitForSize(queue, 3))
      .tap(({ fiber }) => fiber.interrupt())
      .flatMap(({ queue }) => queue.size)

    const result = await program.unsafeRunPromise()

    expect(result).toBe(2)
  })

  it("queue is ordered", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.unbounded<number>())
      .tap(({ queue }) => queue.offer(1))
      .tap(({ queue }) => queue.offer(2))
      .tap(({ queue }) => queue.offer(3))
      .bind("v1", ({ queue }) => queue.take())
      .bind("v2", ({ queue }) => queue.take())
      .bind("v3", ({ queue }) => queue.take())

    const { v1, v2, v3 } = await program.unsafeRunPromise()

    expect(v1).toBe(1)
    expect(v2).toBe(2)
    expect(v3).toBe(3)
  })

  describe("takeAll", () => {
    it("returns all values from a non-empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .tap(({ queue }) => queue.offer(3))
        .flatMap(({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("returns all values from an empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .bind("v1", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.take())
        .bind("v2", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

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
        .bind("v1", ({ queue }) => queue.takeAll())
        .bind("v2", ({ queue }) => queue.take())

      const { v1, v2, values } = await program.unsafeRunPromise()

      expect(v1.toArray()).toEqual(values.toArray())
      expect(v2).toBe(5)
    })
  })

  describe("takeUpTo", () => {
    it("should return the specified number of elements from a non-empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .flatMap(({ queue }) => queue.takeUpTo(2).map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([10, 20])
    })

    it("should return an empty collection from an empty queue", async () => {
      const program = Queue.bounded<number>(100).flatMap((queue) => queue.takeUpTo(2))

      const result = await program.unsafeRunPromise()

      expect(result.isEmpty()).toBe(true)
    })

    it("should handle an empty queue with max higher than queue size", async () => {
      const program = Queue.bounded<number>(100).flatMap((queue) => queue.takeUpTo(101))

      const result = await program.unsafeRunPromise()

      expect(result.isEmpty()).toBe(true)
    })

    it("should leave behind elements if necessary", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(2).map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([10, 20])
    })

    it("should handle not enough items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(10).map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([10, 20, 30, 40])
    })

    it("should handle taking up to 0 items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(0))

      const result = await program.unsafeRunPromise()

      expect(result.isEmpty()).toBe(true)
    })

    it("should handle taking up to -1 items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(-1))

      const result = await program.unsafeRunPromise()

      expect(result.isEmpty()).toBe(true)
    })

    it("should handle taking up to Number.MAX_SAFE_INTEGER items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .flatMap(({ queue }) =>
          queue.takeUpTo(Number.MAX_SAFE_INTEGER).map((chunk) => chunk.toArray())
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([10])
    })

    it("multiple take up to calls", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .bind("v1", ({ queue }) => queue.takeUpTo(2).map((chunk) => chunk.toArray()))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .bind("v2", ({ queue }) => queue.takeUpTo(2).map((chunk) => chunk.toArray()))

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual([10, 20])
      expect(v2).toEqual([30, 40])
    })

    it("consecutive take up to calls", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .bind("v1", ({ queue }) => queue.takeUpTo(2).map((chunk) => chunk.toArray()))
        .bind("v2", ({ queue }) => queue.takeUpTo(2).map((chunk) => chunk.toArray()))

      const { v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toEqual([10, 20])
      expect(v2).toEqual([30, 40])
    })

    it("does not return back-pressured offers", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(4))
        .bindValue("values", () => List(1, 2, 3, 4))
        .tap(({ queue, values }) =>
          values
            .map((n) => queue.offer(n))
            .reduce(Effect.succeed(false), (acc, curr) => acc > curr)
        )
        .bind("fiber", ({ queue }) => queue.offer(5).fork())
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("result", ({ queue }) =>
          queue.takeUpTo(5).map((chunk) => chunk.toArray())
        )
        .tap(({ fiber }) => fiber.interrupt())

      const { result } = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4])
    })
  })

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

  describe("takeN", () => {
    it("returns immediately if there is enough elements", async () => {
      const program = Queue.bounded<number>(100)
        .tap((queue) => queue.offerAll(List(1, 2, 3, 4, 5)))
        .flatMap((queue) => queue.takeN(3).map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("returns an empty list if a negative number or zero is specified", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3)))
        .bind("resNegative", ({ queue }) =>
          queue.takeN(-3).map((chunk) => chunk.toArray())
        )
        .bind("resZero", ({ queue }) => queue.takeN(0).map((chunk) => chunk.toArray()))

      const { resNegative, resZero } = await program.unsafeRunPromise()

      expect(resNegative).toEqual([])
      expect(resZero).toEqual([])
    })

    it("blocks until the required number of elements is available", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bindValue("updater", ({ queue }) => queue.offer(10).forever())
        .bindValue("getter", ({ queue }) =>
          queue.takeN(5).map((chunk) => chunk.toArray())
        )
        .flatMap(({ getter, updater }) => getter.race(updater))

      const result = await program.unsafeRunPromise()

      expect(result.length).toBe(5)
    })
  })

  describe("offerAll", () => {
    it("with takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .bindValue("orders", () => List.range(1, 11))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .tap(({ queue }) => waitForSize(queue, 10))
        .bind("result", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

      const { orders, result } = await program.unsafeRunPromise()

      expect(result).toEqual(orders.toArray())
    })

    it("with takeAll and back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders", () => List.range(1, 4))
        .bind("fiber", ({ orders, queue }) => queue.offerAll(orders).fork())
        .bind("size", ({ queue }) => waitForSize(queue, 3))
        .bind("result", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
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
        .bind("v1", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .bind("v2", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

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
        .bind("result", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .tap(({ fiber }) => fiber.interrupt())

      const { result } = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 65).toArray())
    })

    it("with pending takers", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(50))
        .bindValue("orders", () => List.range(1, 101))
        .bind("takers", ({ orders, queue }) =>
          Effect.forkAll(List.repeat(queue.take(), 100))
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
        .bind("takers", ({ queue }) => Effect.forkAll(List.repeat(queue.take(), 64)))
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
        .bind("takers", ({ queue }) => Effect.forkAll(List.repeat(queue.take(), 100)))
        .tap(({ queue }) => waitForSize(queue, -100))
        .bind("fiber", ({ queue }) => Effect.forkAll(List.repeat(queue.take(), 100)))
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
        .bind("v1", ({ queue }) => queue.take())
        .bind("v2", ({ queue }) => queue.take())
        .bind("v3", ({ queue }) => queue.take())

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
        .bind("v1", ({ queue }) => queue.take())
        .bind("v2", ({ queue }) => queue.take())
        .bind("v3", ({ queue }) => queue.take())
        .bind("v4", ({ queue }) => queue.take())
        .bind("v5", ({ queue }) => queue.take())

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
        .flatMap(({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

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
        .bind("v", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .bind("v1", ({ queue }) => queue.take())
        .bind("v2", ({ queue }) => queue.take())
        .bind("v3", ({ queue }) => queue.take())

      const { v, v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v).toEqual(List.range(1, 33).toArray())
      expect(v1).toBe(33)
      expect(v2).toBe(34)
      expect(v3).toBe(35)
    })
  })

  describe("shutdown", () => {
    it("shutdown with take fiber", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("fiber", ({ queue }) => queue.take().fork())
        .tap(({ queue }) => waitForSize(queue, -1))
        .tap(({ queue }) => queue.shutdown())
        .bind("result", ({ fiber }) => fiber.join().sandbox().either())

      const { result, selfId } = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with offer fiber", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(1))
        .bind("fiber", ({ queue }) => queue.offer(1).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .tap(({ queue }) => queue.shutdown())
        .bind("result", ({ fiber }) => fiber.join().sandbox().either())

      const { result, selfId } = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with offer", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown())
        .bind("result", ({ queue }) => queue.offer(1).sandbox().either())

      const { result, selfId } = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with take", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown())
        .bind("result", ({ queue }) => queue.take().sandbox().either())

      const { result, selfId } = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with takeAll", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown())
        .bind("result", ({ queue }) => queue.takeAll().sandbox().either())

      const { result, selfId } = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with takeUpTo", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown())
        .bind("result", ({ queue }) => queue.takeUpTo(1).sandbox().either())

      const { result, selfId } = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with size", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown())
        .bind("result", ({ queue }) => queue.size.sandbox().either())

      const { result, selfId } = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown race condition with offer", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bind("fiber", ({ queue }) => queue.offer(1).forever().fork())
        .tap(({ queue }) => queue.shutdown())
        .tap(({ fiber }) => fiber.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBeDefined()
    })

    it("shutdown race condition with take", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(1))
        .bind("fiber", ({ queue }) => queue.take().forever().fork())
        .tap(({ queue }) => queue.shutdown())
        .tap(({ fiber }) => fiber.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBeDefined()
    })
  })

  describe("awaitShutdown", () => {
    it("once", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("promise", () => Promise.make<never, boolean>())
        .tap(({ promise, queue }) =>
          (queue.awaitShutdown() > promise.succeed(true)).fork()
        )
        .tap(({ queue }) => queue.shutdown())
        .flatMap(({ promise }) => promise.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("multiple", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("promise1", () => Promise.make<never, boolean>())
        .bind("promise2", () => Promise.make<never, boolean>())
        .tap(({ promise1, queue }) =>
          (queue.awaitShutdown() > promise1.succeed(true)).fork()
        )
        .tap(({ promise2, queue }) =>
          (queue.awaitShutdown() > promise2.succeed(true)).fork()
        )
        .tap(({ queue }) => queue.shutdown())
        .bind("result1", ({ promise1 }) => promise1.await())
        .bind("result2", ({ promise2 }) => promise2.await())

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(true)
      expect(result2).toBe(true)
    })
  })

  describe("poll", () => {
    it("poll on empty queue", async () => {
      const program = Queue.bounded<number>(5).flatMap((queue) => queue.poll())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("poll on queue just emptied", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => List.range(1, 5))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .tap(({ queue }) => queue.takeAll())
        .flatMap(({ queue }) => queue.poll())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("multiple polls", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => List.range(1, 3))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .bind("t1", ({ queue }) => queue.poll())
        .bind("t2", ({ queue }) => queue.poll())
        .bind("t3", ({ queue }) => queue.poll())
        .bind("t4", ({ queue }) => queue.poll())

      const { t1, t2, t3, t4 } = await program.unsafeRunPromise()

      expect(t1).toEqual(Option.some(1))
      expect(t2).toEqual(Option.some(2))
      expect(t3).toEqual(Option.none)
      expect(t4).toEqual(Option.none)
    })
  })

  describe("operations", () => {
    it("map", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<number>(100).map((queue) => queue.map((n) => n.toString()))
        )
        .tap(({ queue }) => queue.offer(10))
        .flatMap(({ queue }) => queue.take())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("10")
    })

    it("map identity", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<number>(100).map((queue) => queue.map(identity))
        )
        .tap(({ queue }) => queue.offer(10))
        .flatMap(({ queue }) => queue.take())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("mapEffect", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<number>(100).map((queue) =>
            queue.mapEffect((n) => Effect.succeed(n.toString()))
          )
        )
        .tap(({ queue }) => queue.offer(10))
        .flatMap(({ queue }) => queue.take())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("10")
    })

    it("mapEffect with success", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<IO<string, number>>(100).map((queue) =>
            queue.mapEffect(identity)
          )
        )
        .tap(({ queue }) => queue.offer(Effect.succeed(10)))
        .flatMap(({ queue }) => queue.take().sandbox().either())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(10))
    })

    it("mapEffect with failure", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<IO<string, number>>(100).map((queue) =>
            queue.mapEffect(identity)
          )
        )
        .tap(({ queue }) => queue.offer(Effect.fail("Ouch")))
        .flatMap(({ queue }) => queue.take())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("Ouch"))
    })

    it("contramap", async () => {
      const program = Queue.bounded<string>(100)
        .map((queue) => queue.contramap((n: number) => n.toString()))
        .tap((queue) => queue.offer(10))
        .flatMap((queue) => queue.take())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("10")
    })

    it("dimap", async () => {
      const program = Queue.bounded<string>(100)
        .map((queue) =>
          queue.dimap(
            (_: number) => _.toString(),
            (_: string) => Number.parseInt(_)
          )
        )
        .tap((queue) => queue.offer(10))
        .flatMap((queue) => queue.take())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("filterInput", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<number>(100).map((queue) =>
            queue.filterInput((n) => n % 2 === 0)
          )
        )
        .tap(({ queue }) => queue.offer(1))
        .bind("s1", ({ queue }) => queue.size)
        .tap(({ queue }) => queue.offer(2))
        .bind("s2", ({ queue }) => queue.size)

      const { s1, s2 } = await program.unsafeRunPromise()

      expect(s1).toBe(0)
      expect(s2).toBe(1)
    })

    it("filterOutput with take", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<number>(100).map((queue) =>
            queue.filterOutput((n) => n % 2 === 0)
          )
        )
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .flatMap(({ queue }) => queue.take())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("filterOutput with takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<number>(100).map((queue) =>
            queue.filterOutput((n) => n % 2 === 0)
          )
        )
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5)))
        .bind("values", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .bind("size", ({ queue }) => queue.size)

      const { size, values } = await program.unsafeRunPromise()

      expect(values).toEqual([2, 4])
      expect(size).toBe(0)
    })

    it("filterOutput with takeUpTo", async () => {
      const program = Effect.Do()
        .bind("queue", () =>
          Queue.bounded<number>(100).map((queue) =>
            queue.filterOutput((n) => n % 2 === 0)
          )
        )
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5)))
        .bind("values", ({ queue }) =>
          queue.takeUpTo(2).map((chunk) => chunk.toArray())
        )
        .bind("size", ({ queue }) => queue.size)

      const { size, values } = await program.unsafeRunPromise()

      expect(values).toEqual([2, 4])
      expect(size).toBe(1)
    })

    it("isShutdown", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bind("r1", ({ queue }) => queue.isShutdown())
        .tap(({ queue }) => queue.offer(1))
        .bind("r2", ({ queue }) => queue.isShutdown())
        .tap(({ queue }) => queue.takeAll())
        .bind("r3", ({ queue }) => queue.isShutdown())
        .tap(({ queue }) => queue.shutdown())
        .bind("r4", ({ queue }) => queue.isShutdown())

      const { r1, r2, r3, r4 } = await program.unsafeRunPromise()

      expect(r1).toBe(false)
      expect(r2).toBe(false)
      expect(r3).toBe(false)
      expect(r4).toBe(true)
    })
  })

  describe("back-pressure", () => {
    it("back-pressured offer completes after take", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(List(1, 2)))
        .bind("fiber", ({ queue }) => queue.offer(3).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.take())
        .bind("v2", ({ queue }) => queue.take())
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
        .bind("v1", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
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
        .bind("v1", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .bind("v2", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .bind("v3", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))
        .tap(({ fiber }) => fiber.join())

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1).toEqual([1, 2])
      expect(v2).toEqual([3, 4])
      expect(v3).toEqual([5])
    })
  })

  describe("sliding strategy", () => {
    it("with offer", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .bind("v1", ({ queue }) => queue.offer(2))
        .bind("v2", ({ queue }) => queue.offer(3))
        .bind("rest", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

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
        .bind("rest", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

      const { rest } = await program.unsafeRunPromise()

      expect(rest).toEqual([1, 2, 3])
    })

    it("with offerAll and takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bind("value", ({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("result", ({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual([5, 6])
      expect(value).toBe(true)
    })

    it("with pending taker", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bindValue("iter", () => List.range(1, 5))
        .tap(({ queue }) => queue.take().fork())
        .tap(({ queue }) => waitForSize(queue, -1))
        .bind("oa", ({ iter, queue }) => queue.offerAll(iter))
        .bind("taken", ({ queue }) => queue.take())

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

  describe("dropping strategy", () => {
    it("with offerAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(4))
        .bindValue("iter", () => List.range(1, 6))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .flatMap(({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4])
    })

    it("with offerAll, check offer returns false", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(2))
        .bind("v1", ({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .tap(({ queue }) => queue.takeAll())

      const { v1 } = await program.unsafeRunPromise()

      expect(v1).toEqual(false)
    })

    it("with offerAll, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(128))
        .bindValue("iter", () => List.range(1, 257))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .flatMap(({ queue }) => queue.takeAll().map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 129).toArray())
    })

    it("with pending taker", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(2))
        .bindValue("iter", () => List.range(1, 5))
        .bind("fiber", ({ queue }) => queue.take().fork())
        .tap(({ queue }) => waitForSize(queue, -1))
        .bind("oa", ({ iter, queue }) => queue.offerAll(iter))
        .bind("j", ({ fiber }) => fiber.join())

      const { j, oa } = await program.unsafeRunPromise()

      expect(j).toBe(1)
      expect(oa).toBe(false)
    })
  })

  describe("bounded strategy", () => {
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
