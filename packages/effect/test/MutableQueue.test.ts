import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { MutableQueue } from "effect"

describe("MutableQueue", () => {
  it("toString", () => {
    const queue = MutableQueue.bounded<number>(2)
    MutableQueue.offerAll([0, 1, 2])(queue)
    strictEqual(
      String(queue),
      `{
  "_id": "MutableQueue",
  "values": [
    0,
    1
  ]
}`
    )
  })

  it("toJSON", () => {
    const queue = MutableQueue.bounded<number>(2)
    MutableQueue.offerAll([0, 1, 2])(queue)
    deepStrictEqual(queue.toJSON(), { _id: "MutableQueue", values: [0, 1] })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")
    const queue = MutableQueue.bounded<number>(2)
    MutableQueue.offerAll([0, 1, 2])(queue)
    deepStrictEqual(inspect(queue), inspect({ _id: "MutableQueue", values: [0, 1] }))
  })

  describe("bounded", () => {
    it("length", () => {
      const queue = MutableQueue.bounded<number>(2)
      strictEqual(MutableQueue.length(queue), 0)
      MutableQueue.offerAll([0, 1, 2, 3, 4, 5])(queue)
      strictEqual(MutableQueue.length(queue), 2)
    })

    it("isEmpty", () => {
      const queue = MutableQueue.bounded<number>(2)
      assertTrue(MutableQueue.isEmpty(queue))
      MutableQueue.offerAll([1, 2, 3])(queue)
      assertFalse(MutableQueue.isEmpty(queue))
    })

    it("isFull", () => {
      const queue = MutableQueue.bounded<number>(2)
      assertFalse(MutableQueue.isFull(queue))
      MutableQueue.offer(0)(queue)
      assertFalse(MutableQueue.isFull(queue))
      MutableQueue.offer(1)(queue)
      assertTrue(MutableQueue.isFull(queue))
    })

    it("offer", () => {
      const queue = MutableQueue.bounded<number>(2)
      MutableQueue.offer(0)(queue)
      MutableQueue.offer(1)(queue)
      MutableQueue.offer(2)(queue)

      deepStrictEqual(Array.from(queue), [0, 1])
    })

    it("offerAll", () => {
      const queue = MutableQueue.bounded<number>(2)
      const remainder = MutableQueue.offerAll([0, 1, 2, 3, 4, 5])(queue)

      deepStrictEqual(Array.from(queue), [0, 1])
      deepStrictEqual(Array.from(remainder), [2, 3, 4, 5])
    })

    it("poll", () => {
      const queue = MutableQueue.bounded<number>(2)
      strictEqual(
        MutableQueue.poll(MutableQueue.EmptyMutableQueue)(queue),
        MutableQueue.EmptyMutableQueue
      )
      MutableQueue.offer(0)(queue)
      strictEqual(MutableQueue.poll(MutableQueue.EmptyMutableQueue)(queue), 0)
    })

    it("pollUpTo", () => {
      const queue = MutableQueue.bounded<number>(5)
      deepStrictEqual(Array.from(MutableQueue.pollUpTo(2)(queue)), [])
      MutableQueue.offerAll([1, 2, 3, 4, 5])(queue)
      strictEqual(MutableQueue.length(queue), 5)
      deepStrictEqual(Array.from(MutableQueue.pollUpTo(2)(queue)), [1, 2])
      strictEqual(MutableQueue.length(queue), 3)
    })
  })

  describe("unbounded", () => {
    it("capacity", () => {
      const queue = MutableQueue.unbounded<number>()

      strictEqual(MutableQueue.capacity(queue), Infinity)
    })

    it("length", () => {
      const queue = MutableQueue.unbounded<number>()
      strictEqual(MutableQueue.length(queue), 0)
      MutableQueue.offerAll([0, 1, 2, 3, 4, 5])(queue)
      strictEqual(MutableQueue.length(queue), 6)
    })

    it("isEmpty", () => {
      const queue = MutableQueue.unbounded<number>()
      assertTrue(MutableQueue.isEmpty(queue))
      MutableQueue.offerAll([1, 2, 3])(queue)
      assertFalse(MutableQueue.isEmpty(queue))
    })

    it("isFull", () => {
      const queue = MutableQueue.unbounded<number>()
      assertFalse(MutableQueue.isFull(queue))
      MutableQueue.offer(0)(queue)
      assertFalse(MutableQueue.isFull(queue))
      MutableQueue.offer(1)(queue)
      assertFalse(MutableQueue.isFull(queue))
    })

    it("offer", () => {
      const queue = MutableQueue.unbounded<number>()
      MutableQueue.offer(0)(queue)
      MutableQueue.offer(1)(queue)
      MutableQueue.offer(2)(queue)

      deepStrictEqual(Array.from(queue), [0, 1, 2])
    })

    it("offerAll", () => {
      const queue = MutableQueue.unbounded<number>()
      const remainder = MutableQueue.offerAll([0, 1, 2, 3, 4, 5])(queue)

      deepStrictEqual(Array.from(queue), [0, 1, 2, 3, 4, 5])
      deepStrictEqual(Array.from(remainder), [])
    })

    it("poll", () => {
      const queue = MutableQueue.unbounded<number>()
      strictEqual(
        MutableQueue.poll(MutableQueue.EmptyMutableQueue)(queue),
        MutableQueue.EmptyMutableQueue
      )
      MutableQueue.offer(0)(queue)
      strictEqual(MutableQueue.poll(MutableQueue.EmptyMutableQueue)(queue), 0)
    })

    it("pollUpTo", () => {
      const queue = MutableQueue.unbounded<number>()
      deepStrictEqual(Array.from(MutableQueue.pollUpTo(2)(queue)), [])
      MutableQueue.offerAll([1, 2, 3, 4, 5])(queue)
      strictEqual(MutableQueue.length(queue), 5)
      deepStrictEqual(Array.from(MutableQueue.pollUpTo(2)(queue)), [1, 2])
      strictEqual(MutableQueue.length(queue), 3)
    })
  })
})
