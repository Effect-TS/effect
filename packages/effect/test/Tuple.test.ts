import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { pipe, Tuple } from "effect"

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
})
