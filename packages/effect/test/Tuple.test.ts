import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Equivalence, Order, pipe, Tuple } from "effect"

describe("Tuple", () => {
  it("make", () => {
    deepStrictEqual(Tuple.make("a", 1, true), ["a", 1, true])
  })

  it("appendElement", () => {
    deepStrictEqual(pipe(Tuple.make("a", 1), Tuple.appendElement(true)), ["a", 1, true])
  })

  it("getFirst", () => {
    strictEqual(Tuple.getFirst(Tuple.make("a", 1)), "a")
  })

  it("getSecond", () => {
    strictEqual(Tuple.getSecond(Tuple.make("a", 1)), 1)
  })

  it("mapBoth", () => {
    deepStrictEqual(
      Tuple.mapBoth(Tuple.make("a", 1), {
        onFirst: (s) => s + "!",
        onSecond: (n) => n * 2
      }),
      ["a!", 2]
    )
  })

  it("map", () => {
    deepStrictEqual(Tuple.map(["a", 1, false], (x) => x.toString().toUpperCase()), ["A", "1", "FALSE"])
  })

  it("swap", () => {
    deepStrictEqual(Tuple.swap(Tuple.make("a", 1)), [1, "a"])
  })

  it("at", () => {
    deepStrictEqual(Tuple.at([1, "hello", true], 1), "hello")
  })

  it("mapFirst", () => {
    deepStrictEqual(Tuple.mapFirst(Tuple.make("a", 1), (s) => s + "!"), ["a!", 1])
    deepStrictEqual(pipe(Tuple.make("a", 1), Tuple.mapFirst((s) => s + "!")), ["a!", 1])
  })

  it("mapSecond", () => {
    deepStrictEqual(Tuple.mapSecond(Tuple.make("a", 1), (n) => n * 2), ["a", 2])
    deepStrictEqual(pipe(Tuple.make("a", 1), Tuple.mapSecond((n) => n * 2)), ["a", 2])
  })

  it("getEquivalence", () => {
    const equivalence = Tuple.getEquivalence(Equivalence.string, Equivalence.number)
    strictEqual(equivalence(Tuple.make("a", 1), Tuple.make("a", 1)), true)
    strictEqual(equivalence(Tuple.make("a", 1), Tuple.make("a", 2)), false)
    strictEqual(equivalence(Tuple.make("a", 1), Tuple.make("b", 1)), false)
  })

  it("getOrder", () => {
    const order = Tuple.getOrder(Order.string, Order.number)
    strictEqual(order(Tuple.make("a", 1), Tuple.make("a", 2)), -1)
    strictEqual(order(Tuple.make("a", 1), Tuple.make("a", 1)), 0)
    strictEqual(order(Tuple.make("b", 1), Tuple.make("a", 1)), 1)
  })
})
