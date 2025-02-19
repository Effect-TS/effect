import { hole, pipe } from "effect/Function"
import * as T from "effect/Tuple"
import { describe, expect, it } from "tstyche"

declare const string$number: [string, number]
declare const readonlyString$number: readonly [string, number]
declare const arrayOfNumbers: Array<number>

describe("Tuple", () => {
  it("make", () => {
    expect(T.make("a", 1, true))
      .type.toBe<[string, number, boolean]>()
  })

  it("appendElement", () => {
    expect(T.appendElement(T.make("a", 1), true))
      .type.toBe<[string, number, boolean]>()
    expect(pipe(T.make("a", 1), T.appendElement(true)))
      .type.toBe<[string, number, boolean]>()
  })

  describe("at", () => {
    it("should return undefined for an empty tuple", () => {
      expect(T.at(hole<[]>(), 0))
        .type.toBe<undefined>()
      expect(pipe(hole<[]>(), T.at(0)))
        .type.toBe<undefined>()

      expect(T.at(hole<readonly []>(), 0))
        .type.toBe<undefined>()
      expect(pipe(hole<readonly []>(), T.at(0)))
        .type.toBe<undefined>()
    })

    it("should return the first element for [string, number]", () => {
      expect(T.at(string$number, 0))
        .type.toBe<string>()
      expect(pipe(string$number, T.at(0)))
        .type.toBe<string>()

      expect(T.at(readonlyString$number, 0))
        .type.toBe<string>()
      expect(pipe(readonlyString$number, T.at(0)))
        .type.toBe<string>()
    })

    it("should return the second element for [string, number]", () => {
      expect(T.at(string$number, 1))
        .type.toBe<number>()
      expect(pipe(string$number, T.at(1)))
        .type.toBe<number>()

      expect(T.at(readonlyString$number, 1))
        .type.toBe<number>()
      expect(pipe(readonlyString$number, T.at(1)))
        .type.toBe<number>()
    })

    it("should return undefined for an out-of-bound index", () => {
      expect(T.at(string$number, 2))
        .type.toBe<undefined>()
      expect(pipe(string$number, T.at(2)))
        .type.toBe<undefined>()

      expect(T.at(readonlyString$number, 2))
        .type.toBe<undefined>()
      expect(pipe(readonlyString$number, T.at(2)))
        .type.toBe<undefined>()
    })

    it("should return string | number for a negative index", () => {
      expect(T.at(string$number, -1))
        .type.toBe<string | number>()
      expect(pipe(string$number, T.at(-1)))
        .type.toBe<string | number>()

      expect(T.at(readonlyString$number, -1))
        .type.toBe<string | number>()
      expect(pipe(readonlyString$number, T.at(-1)))
        .type.toBe<string | number>()
    })

    it("should work with arrays", () => {
      expect(T.at(arrayOfNumbers, 1))
        .type.toBe<number>()
      expect(pipe(arrayOfNumbers, T.at(1)))
        .type.toBe<number>()

      expect(T.at(arrayOfNumbers, -1))
        .type.toBe<number>()
      expect(pipe(arrayOfNumbers, T.at(-1)))
        .type.toBe<number>()
    })
  })

  it("map", () => {
    expect(pipe(
      T.make("a", 1),
      T.appendElement(true),
      T.map((x) => {
        expect(x).type.toBe<string | number | boolean>()
        return false as const
      })
    ))
      .type.toBe<[false, false, false]>()

    expect(T.map(["a", 1, false], (x) => {
      expect(x).type.toBe<string | number | boolean>()
      return false as const
    }))
      .type.toBe<[false, false, false]>()
  })
})
