import { pipe } from "effect/Function"
import * as _ from "effect/Order"
import { sort } from "effect/ReadonlyArray"
import * as U from "./util"

describe.concurrent("Order", () => {
  it("struct", () => {
    const O = _.struct({ a: _.string, b: _.string })
    U.deepStrictEqual(O({ a: "a", b: "b" }, { a: "a", b: "c" }), -1)
    U.deepStrictEqual(O({ a: "a", b: "b" }, { a: "a", b: "b" }), 0)
    U.deepStrictEqual(O({ a: "a", b: "c" }, { a: "a", b: "b" }), 1)
  })

  it("tuple", () => {
    const O = _.tuple(_.string, _.string)
    U.deepStrictEqual(O(["a", "b"], ["a", "c"]), -1)
    U.deepStrictEqual(O(["a", "b"], ["a", "b"]), 0)
    U.deepStrictEqual(O(["a", "b"], ["a", "a"]), 1)
    U.deepStrictEqual(O(["a", "b"], ["b", "a"]), -1)
  })

  it("all", () => {
    const O = _.all([_.string, _.string, _.string])
    U.deepStrictEqual(O([], []), 0)
    U.deepStrictEqual(O(["a", "b"], ["a"]), 0)
    U.deepStrictEqual(O(["a"], ["a", "c"]), 0)
    U.deepStrictEqual(O(["a", "b"], ["a", "c"]), -1)
    U.deepStrictEqual(O(["a", "b"], ["a", "b"]), 0)
    U.deepStrictEqual(O(["a", "b"], ["a", "a"]), 1)
    U.deepStrictEqual(O(["a", "b"], ["b", "a"]), -1)
  })

  it("mapInput", () => {
    const O = _.mapInput(_.number, (s: string) => s.length)
    U.deepStrictEqual(O("a", "b"), 0)
    U.deepStrictEqual(O("a", "bb"), -1)
    U.deepStrictEqual(O("aa", "b"), 1)
  })

  it("Date", () => {
    const O = _.Date
    U.deepStrictEqual(O(new Date(0), new Date(1)), -1)
    U.deepStrictEqual(O(new Date(1), new Date(1)), 0)
    U.deepStrictEqual(O(new Date(1), new Date(0)), 1)
  })

  it("clamp", () => {
    const clamp = _.clamp(_.number)
    U.deepStrictEqual(clamp(2, 1, 10), 2)
    U.deepStrictEqual(clamp(10, 1, 10), 10)
    U.deepStrictEqual(clamp(20, 1, 10), 10)
    U.deepStrictEqual(clamp(1, 1, 10), 1)
    U.deepStrictEqual(clamp(-10, 1, 10), 1)
  })

  it("between", () => {
    const between = _.between(_.number)
    U.deepStrictEqual(between(2, 1, 10), true)
    U.deepStrictEqual(between(10, 1, 10), true)
    U.deepStrictEqual(between(20, 1, 10), false)
    U.deepStrictEqual(between(1, 1, 10), true)
    U.deepStrictEqual(between(-10, 1, 10), false)
  })

  it("reverse", () => {
    const O = _.reverse(_.number)
    U.deepStrictEqual(O(1, 2), 1)
    U.deepStrictEqual(O(2, 1), -1)
    U.deepStrictEqual(O(2, 2), 0)
  })

  it("lessThan", () => {
    const lessThan = _.lessThan(_.number)
    U.deepStrictEqual(lessThan(0, 1), true)
    U.deepStrictEqual(lessThan(1, 1), false)
    U.deepStrictEqual(lessThan(2, 1), false)
  })

  it("lessThanOrEqualTo", () => {
    const lessThanOrEqualTo = _.lessThanOrEqualTo(_.number)
    U.deepStrictEqual(lessThanOrEqualTo(0, 1), true)
    U.deepStrictEqual(lessThanOrEqualTo(1, 1), true)
    U.deepStrictEqual(lessThanOrEqualTo(2, 1), false)
  })

  it("greaterThan", () => {
    const greaterThan = _.greaterThan(_.number)
    U.deepStrictEqual(greaterThan(0, 1), false)
    U.deepStrictEqual(greaterThan(1, 1), false)
    U.deepStrictEqual(greaterThan(2, 1), true)
  })

  it("greaterThanOrEqualTo", () => {
    const greaterThanOrEqualTo = _.greaterThanOrEqualTo(_.number)
    U.deepStrictEqual(greaterThanOrEqualTo(0, 1), false)
    U.deepStrictEqual(greaterThanOrEqualTo(1, 1), true)
    U.deepStrictEqual(greaterThanOrEqualTo(2, 1), true)
  })

  it("min", () => {
    type A = { a: number }
    const min = _.min(
      pipe(
        _.number,
        _.mapInput((a: A) => a.a)
      )
    )
    U.deepStrictEqual(min({ a: 1 }, { a: 2 }), { a: 1 })
    U.deepStrictEqual(min({ a: 2 }, { a: 1 }), { a: 1 })
    const first = { a: 1 }
    const second = { a: 1 }
    U.strictEqual(min(first, second), first)
  })

  it("max", () => {
    type A = { a: number }
    const max = _.max(
      pipe(
        _.number,
        _.mapInput((a: A) => a.a)
      )
    )
    U.deepStrictEqual(max({ a: 1 }, { a: 2 }), { a: 2 })
    U.deepStrictEqual(max({ a: 2 }, { a: 1 }), { a: 2 })
    const first = { a: 1 }
    const second = { a: 1 }
    U.strictEqual(max(first, second), first)
  })

  it("product", () => {
    const O = _.product(_.string, _.number)
    U.deepStrictEqual(O(["a", 1], ["a", 2]), -1)
    U.deepStrictEqual(O(["a", 1], ["a", 1]), 0)
    U.deepStrictEqual(O(["a", 1], ["a", 0]), 1)
    U.deepStrictEqual(O(["a", 1], ["b", 1]), -1)
  })

  it("productMany", () => {
    const O = _.productMany(_.string, [_.string, _.string])
    U.deepStrictEqual(O(["a", "b"], ["a", "c"]), -1)
    U.deepStrictEqual(O(["a", "b"], ["a", "b"]), 0)
    U.deepStrictEqual(O(["a", "b"], ["a", "a"]), 1)
    U.deepStrictEqual(O(["a", "b"], ["b", "a"]), -1)
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
      _.number,
      _.mapInput((x: T) => x[0])
    )
    const sortBySnd = pipe(
      _.string,
      _.mapInput((x: T) => x[1])
    )
    U.deepStrictEqual(sort(_.combine(sortByFst, sortBySnd))(tuples), [
      [1, "b"],
      [1, "c"],
      [2, "a"],
      [2, "c"]
    ])
    U.deepStrictEqual(sort(_.combine(sortBySnd, sortByFst))(tuples), [
      [2, "a"],
      [1, "b"],
      [1, "c"],
      [2, "c"]
    ])
    U.deepStrictEqual(sort(_.combineMany(sortBySnd, []))(tuples), [
      [2, "a"],
      [1, "b"],
      [2, "c"],
      [1, "c"]
    ])
    U.deepStrictEqual(sort(_.combineMany(sortBySnd, [sortByFst]))(tuples), [
      [2, "a"],
      [1, "b"],
      [1, "c"],
      [2, "c"]
    ])
  })
})
