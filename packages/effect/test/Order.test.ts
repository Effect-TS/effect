import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Array as Arr, Order, pipe } from "effect"

describe("Order", () => {
  it("struct", () => {
    const O = Order.struct({ a: Order.string, b: Order.string })
    strictEqual(O({ a: "a", b: "b" }, { a: "a", b: "c" }), -1)
    strictEqual(O({ a: "a", b: "b" }, { a: "a", b: "b" }), 0)
    strictEqual(O({ a: "a", b: "c" }, { a: "a", b: "b" }), 1)
  })

  it("tuple", () => {
    const O = Order.tuple(Order.string, Order.string)
    strictEqual(O(["a", "b"], ["a", "c"]), -1)
    strictEqual(O(["a", "b"], ["a", "b"]), 0)
    strictEqual(O(["a", "b"], ["a", "a"]), 1)
    strictEqual(O(["a", "b"], ["b", "a"]), -1)
  })

  it("all", () => {
    const O = Order.all([Order.string, Order.string, Order.string])
    strictEqual(O([], []), 0)
    strictEqual(O(["a", "b"], ["a"]), 0)
    strictEqual(O(["a"], ["a", "c"]), 0)
    strictEqual(O(["a", "b"], ["a", "c"]), -1)
    strictEqual(O(["a", "b"], ["a", "b"]), 0)
    strictEqual(O(["a", "b"], ["a", "a"]), 1)
    strictEqual(O(["a", "b"], ["b", "a"]), -1)
  })

  it("mapInput", () => {
    const O = Order.mapInput(Order.number, (s: string) => s.length)
    strictEqual(O("a", "b"), 0)
    strictEqual(O("a", "bb"), -1)
    strictEqual(O("aa", "b"), 1)
  })

  it("Date", () => {
    const O = Order.Date
    strictEqual(O(new Date(0), new Date(1)), -1)
    strictEqual(O(new Date(1), new Date(1)), 0)
    strictEqual(O(new Date(1), new Date(0)), 1)
  })

  it("clamp", () => {
    const clamp = Order.clamp(Order.number)({ minimum: 1, maximum: 10 })
    strictEqual(clamp(2), 2)
    strictEqual(clamp(10), 10)
    strictEqual(clamp(20), 10)
    strictEqual(clamp(1), 1)
    strictEqual(clamp(-10), 1)

    strictEqual(Order.clamp(Order.number)({ minimum: 1, maximum: 10 })(2), 2)
  })

  it("between", () => {
    const between = Order.between(Order.number)({ minimum: 1, maximum: 10 })
    assertTrue(between(2))
    assertTrue(between(10))
    assertFalse(between(20))
    assertTrue(between(1))
    assertFalse(between(-10))

    assertTrue(Order.between(Order.number)(2, { minimum: 1, maximum: 10 }))
  })

  it("reverse", () => {
    const O = Order.reverse(Order.number)
    strictEqual(O(1, 2), 1)
    strictEqual(O(2, 1), -1)
    strictEqual(O(2, 2), 0)
  })

  it("lessThan", () => {
    const lessThan = Order.lessThan(Order.number)
    assertTrue(lessThan(0, 1))
    assertFalse(lessThan(1, 1))
    assertFalse(lessThan(2, 1))
  })

  it("lessThanOrEqualTo", () => {
    const lessThanOrEqualTo = Order.lessThanOrEqualTo(Order.number)
    assertTrue(lessThanOrEqualTo(0, 1))
    assertTrue(lessThanOrEqualTo(1, 1))
    assertFalse(lessThanOrEqualTo(2, 1))
  })

  it("greaterThan", () => {
    const greaterThan = Order.greaterThan(Order.number)
    assertFalse(greaterThan(0, 1))
    assertFalse(greaterThan(1, 1))
    assertTrue(greaterThan(2, 1))
  })

  it("greaterThanOrEqualTo", () => {
    const greaterThanOrEqualTo = Order.greaterThanOrEqualTo(Order.number)
    assertFalse(greaterThanOrEqualTo(0, 1))
    assertTrue(greaterThanOrEqualTo(1, 1))
    assertTrue(greaterThanOrEqualTo(2, 1))
  })

  it("min", () => {
    type A = { a: number }
    const min = Order.min(
      pipe(
        Order.number,
        Order.mapInput((a: A) => a.a)
      )
    )
    deepStrictEqual(min({ a: 1 }, { a: 2 }), { a: 1 })
    deepStrictEqual(min({ a: 2 }, { a: 1 }), { a: 1 })
    const first = { a: 1 }
    const second = { a: 1 }
    deepStrictEqual(min(first, second), first)
  })

  it("max", () => {
    type A = { a: number }
    const max = Order.max(
      pipe(
        Order.number,
        Order.mapInput((a: A) => a.a)
      )
    )
    deepStrictEqual(max({ a: 1 }, { a: 2 }), { a: 2 })
    deepStrictEqual(max({ a: 2 }, { a: 1 }), { a: 2 })
    const first = { a: 1 }
    const second = { a: 1 }
    deepStrictEqual(max(first, second), first)
  })

  it("product", () => {
    const O = Order.product(Order.string, Order.number)
    strictEqual(O(["a", 1], ["a", 2]), -1)
    strictEqual(O(["a", 1], ["a", 1]), 0)
    strictEqual(O(["a", 1], ["a", 0]), 1)
    strictEqual(O(["a", 1], ["b", 1]), -1)
  })

  it("productMany", () => {
    const O = Order.productMany(Order.string, [Order.string, Order.string])
    strictEqual(O(["a", "b"], ["a", "c"]), -1)
    strictEqual(O(["a", "b"], ["a", "b"]), 0)
    strictEqual(O(["a", "b"], ["a", "a"]), 1)
    strictEqual(O(["a", "b"], ["b", "a"]), -1)
  })

  it("combine / combineMany", () => {
    type T = [number, string]
    const tuples: Array<T> = [
      [2, "c"],
      [1, "b"],
      [2, "a"],
      [1, "c"]
    ]
    const sortByFst = pipe(
      Order.number,
      Order.mapInput((x: T) => x[0])
    )
    const sortBySnd = pipe(
      Order.string,
      Order.mapInput((x: T) => x[1])
    )
    deepStrictEqual(Arr.sort(Order.combine(sortByFst, sortBySnd))(tuples), [
      [1, "b"],
      [1, "c"],
      [2, "a"],
      [2, "c"]
    ])
    deepStrictEqual(Arr.sort(Order.combine(sortBySnd, sortByFst))(tuples), [
      [2, "a"],
      [1, "b"],
      [1, "c"],
      [2, "c"]
    ])
    deepStrictEqual(Arr.sort(Order.combineMany(sortBySnd, []))(tuples), [
      [2, "a"],
      [1, "b"],
      [2, "c"],
      [1, "c"]
    ])
    deepStrictEqual(Arr.sort(Order.combineMany(sortBySnd, [sortByFst]))(tuples), [
      [2, "a"],
      [1, "b"],
      [1, "c"],
      [2, "c"]
    ])
  })
})
