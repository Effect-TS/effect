import { pipe } from "effect/Function"
import * as T from "effect/Tuple"
import { describe, expect, it } from "vitest"

describe("Tuple", () => {
  it("exports", () => {
    expect(T.getOrder).exist
    expect(T.getEquivalence).exist
  })

  it("make", () => {
    expect(T.make("a", 1, true)).toEqual(["a", 1, true])
  })

  it("appendElement", () => {
    expect(pipe(T.make("a", 1), T.appendElement(true))).toEqual(["a", 1, true])
  })

  it("getFirst", () => {
    expect(T.getFirst(T.make("a", 1))).toEqual("a")
  })

  it("getSecond", () => {
    expect(T.getSecond(T.make("a", 1))).toEqual(1)
  })

  it("mapBoth", () => {
    expect(T.mapBoth(T.make("a", 1), {
      onFirst: (s) => s + "!",
      onSecond: (n) => n * 2
    })).toEqual(["a!", 2])
  })

  it("map", () => {
    expect(T.map(["a", 1, false], (x) => x.toString().toUpperCase())).toEqual(["A", "1", "FALSE"])
  })

  it("swap", () => {
    expect(T.swap(T.make("a", 1))).toEqual([1, "a"])
  })

  it("at", () => {
    expect(T.at([1, "hello", true], 1)).toEqual("hello")
  })
})
