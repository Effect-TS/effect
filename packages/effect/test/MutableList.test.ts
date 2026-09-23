import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { MutableList } from "effect"

describe("MutableList", () => {
  it("prependAll with no values preserves existing elements", () => {
    const list = MutableList.make<number>()
    MutableList.appendAll(list, [1, 2])
    MutableList.prependAll(list, [])
    strictEqual(list.length, 2)
    strictEqual(MutableList.take(list), 1)
    strictEqual(MutableList.take(list), 2)
    strictEqual(list.length, 0)
  })

  it("prependAll with no values keeps an empty list appendable", () => {
    const list = MutableList.make<number>()
    MutableList.prependAll(list, [])
    strictEqual(list.length, 0)
    strictEqual(list.head, undefined)
    strictEqual(list.tail, undefined)
    MutableList.appendAll(list, [3])
    strictEqual(MutableList.take(list), 3)
  const takeOne = [
    (list: MutableList.MutableList<number>) => MutableList.take(list),
    (list: MutableList.MutableList<number>) => MutableList.takeN(list, 1),
    (list: MutableList.MutableList<number>) => MutableList.takeNVoid(list, 1)
  ]

  it("bounds the retained slots of a list that never fully drains", () => {
    for (const take of takeOne) {
      const list = MutableList.make<number>()
      MutableList.append(list, 0)
      for (let i = 1; i < 10_000; i++) {
        MutableList.append(list, i)
        take(list)
      }
      let slots = 0
      for (let bucket = list.head; bucket; bucket = bucket.next) slots += bucket.array.length
      strictEqual(slots <= 2048, true, `retained ${slots} slots for one element`)
      deepStrictEqual(MutableList.takeAll(list), [9_999])
    }

    for (const [live, slots] of [[128, 128], [129, 1153]]) {
      const edge = MutableList.make<number>()
      for (let i = 0; i < 1024 + live; i++) MutableList.append(edge, i)
      for (let i = 0; i < 1024; i++) MutableList.take(edge)
      strictEqual(edge.head?.array.length, slots)
    }

    const chained = MutableList.make<number>()
    MutableList.appendAll(chained, new Set(Array.from({ length: 2048 }, (_, i) => i)))
    MutableList.appendAll(chained, [2048])
    MutableList.takeNVoid(chained, 1920)
    deepStrictEqual(MutableList.takeAll(chained), Array.from({ length: 129 }, (_, i) => i + 1920))
  })

  it("copies at most one element per eight it takes while draining a burst", () => {
    for (const take of takeOne) {
      const n = 1 << 16
      const list = MutableList.make<number>()
      for (let i = 0; i < n; i++) MutableList.append(list, i)
      let array = list.head?.array
      let copied = 0
      while (list.length > 0) {
        take(list)
        if (list.head !== undefined && list.head.array !== array) {
          array = list.head.array
          copied += array.length
        }
      }
      strictEqual(copied * 8 <= n, true, `copied ${copied} elements while taking ${n}`)
    }
  })

  it("preserves a prepended element when appending to the list", () => {
    const list = MutableList.make<number>()
    MutableList.prepend(list, 1)
    MutableList.append(list, 2)

    strictEqual(MutableList.toArray(list).join(","), "1,2")
    strictEqual(list.length, 2)
  })

  it("preserves bulk-prepended values when appending to the list", () => {
    const list = MutableList.make<number>()
    MutableList.prependAll(list, [1, 2])
    MutableList.append(list, 3)

    deepStrictEqual(MutableList.toArray(list), [1, 2, 3], "bulk-prepended values should be preserved")
  })

  it("returns an empty snapshot for a negative bound", () => {
    const list = MutableList.make<number>()
    MutableList.append(list, 1)

    deepStrictEqual(MutableList.toArrayN(list, -1), [])
  })

  it("normalizes bounded operation counts", () => {
    const takeNaN = MutableList.make<number>()
    MutableList.appendAll(takeNaN, [1, 2, 3])
    deepStrictEqual(MutableList.takeN(takeNaN, Number.NaN), [])
    deepStrictEqual(MutableList.toArray(takeNaN), [1, 2, 3])

    const takeFraction = MutableList.make<number>()
    MutableList.appendAll(takeFraction, [1, 2, 3])
    deepStrictEqual(MutableList.takeN(takeFraction, 1.9), [1])
    deepStrictEqual(MutableList.toArray(takeFraction), [2, 3])

    const discardNaN = MutableList.make<number>()
    MutableList.appendAll(discardNaN, [1, 2, 3])
    MutableList.takeNVoid(discardNaN, Number.NaN)
    deepStrictEqual(MutableList.toArray(discardNaN), [1, 2, 3])

    const discardFraction = MutableList.make<number>()
    MutableList.appendAll(discardFraction, [1, 2, 3])
    MutableList.takeNVoid(discardFraction, 1.9)
    deepStrictEqual(MutableList.toArray(discardFraction), [2, 3])

    const snapshot = MutableList.make<number>()
    MutableList.appendAll(snapshot, [1, 2, 3])
    deepStrictEqual(MutableList.toArrayN(snapshot, Number.NaN), [])
    deepStrictEqual(MutableList.toArrayN(snapshot, 1.9), [1])
  })

  it("appendAll returns 0 and leaves an empty list empty", () => {
    const list = MutableList.make<number>()

    strictEqual(MutableList.appendAll(list, []), 0)
    strictEqual(list.length, 0)
    strictEqual(list.head, undefined)
    strictEqual(list.tail, undefined)
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("appendAll with empty iterables preserves later append order", () => {
    const list = MutableList.make<number>()

    MutableList.appendAll(list, [])
    MutableList.append(list, 1)
    MutableList.appendAll(list, [])
    MutableList.append(list, 2)

    deepStrictEqual(MutableList.takeAll(list), [1, 2])
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("appendAllUnsafe with an empty array is a no-op", () => {
    const list = MutableList.make<number>()

    MutableList.appendAll(list, [1])
    strictEqual(MutableList.appendAllUnsafe(list, []), 0)
    MutableList.append(list, 2)

    deepStrictEqual(MutableList.takeAll(list), [1, 2])
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("filter keeps matching values in place and updates length", () => {
    const list = MutableList.make<number>()
    MutableList.appendAll(list, [1, 2, 3, 4, 5])

    MutableList.filter(list, (n) => n % 2 === 0)

    deepStrictEqual(MutableList.toArrayN(list, 2), [2, 4])
    strictEqual(list.length, 2)
  })

  it("filter restores the empty list state when no values match", () => {
    const list = MutableList.make<number>()
    MutableList.append(list, 1)

    MutableList.filter(list, () => false)

    strictEqual(list.length, 0)
    strictEqual(list.head, undefined)
    strictEqual(list.tail, undefined)
    strictEqual(MutableList.take(list), MutableList.Empty)
  })

  it("remove deletes all strictly equal values and updates length", () => {
    const list = MutableList.make<string>()
    MutableList.appendAll(list, ["apple", "banana", "apple", "cherry", "apple"])

    MutableList.remove(list, "apple")

    deepStrictEqual(MutableList.toArrayN(list, 2), ["banana", "cherry"])
    strictEqual(list.length, 2)
  })
})