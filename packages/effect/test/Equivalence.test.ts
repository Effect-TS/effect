import * as _ from "effect/Equivalence"
import { pipe } from "effect/Function"
import { describe, expect, it } from "vitest"

describe.concurrent("Equivalence", () => {
  it("array", () => {
    const eq = _.array(_.number)

    expect(eq([], [])).toEqual(true)
    expect(eq([1, 2, 3], [1, 2, 3])).toEqual(true)
    expect(eq([1, 2, 3], [1, 2, 4])).toEqual(false)
    expect(eq([1, 2, 3], [1, 2])).toEqual(false)
  })

  it("strict returns an Equivalence that uses strict equality (===) to compare values", () => {
    const eq = _.strict<{ a: number }>()
    const a = { a: 1 }
    expect(eq(a, a)).toBe(true)
    expect(eq({ a: 1 }, { a: 1 })).toBe(false)
  })

  it("mapInput", () => {
    interface Person {
      readonly name: string
      readonly age: number
    }
    const eqPerson = pipe(_.string, _.mapInput((p: Person) => p.name))
    expect(eqPerson({ name: "a", age: 1 }, { name: "a", age: 2 })).toEqual(true)
    expect(eqPerson({ name: "a", age: 1 }, { name: "a", age: 1 })).toEqual(true)
    expect(eqPerson({ name: "a", age: 1 }, { name: "b", age: 1 })).toEqual(false)
    expect(eqPerson({ name: "a", age: 1 }, { name: "b", age: 2 })).toEqual(false)
  })

  it("Date", () => {
    const eq = _.Date
    expect(eq(new Date(0), new Date(0))).toEqual(true)
    expect(eq(new Date(0), new Date(1))).toEqual(false)
    expect(eq(new Date(1), new Date(0))).toEqual(false)
  })

  it("product", () => {
    const eq = _.product(_.string, _.string)
    expect(eq(["a", "b"], ["a", "b"])).toEqual(true)
    expect(eq(["a", "b"], ["c", "b"])).toEqual(false)
    expect(eq(["a", "b"], ["a", "c"])).toEqual(false)
  })

  it("productMany", () => {
    const eq = _.productMany(_.string, [_.string])
    expect(eq(["a", "b"], ["a", "b"])).toEqual(true)
    expect(eq(["a", "b"], ["a", "b", "c"])).toEqual(true)
    expect(eq(["a", "b", "c"], ["a", "b"])).toEqual(true)
    expect(eq(["a", "b"], ["c", "b"])).toEqual(false)
    expect(eq(["a", "b"], ["a", "c"])).toEqual(false)
  })

  it("all", () => {
    const eq = _.all([_.string, _.string])
    expect(eq([], [])).toEqual(true)
    expect(eq([], ["a"])).toEqual(true)
    expect(eq(["a"], [])).toEqual(true)
    expect(eq(["a"], ["a"])).toEqual(true)
    expect(eq(["a"], ["b"])).toEqual(false)
    expect(eq(["a"], ["a", "b"])).toEqual(true)
    expect(eq(["a", "b"], ["a"])).toEqual(true)
    expect(eq(["a", "b"], ["a", "b"])).toEqual(true)
    expect(eq(["a", "b"], ["a", "c"])).toEqual(false)
  })

  it("combine", () => {
    type T = readonly [string, number, boolean]
    const E0: _.Equivalence<T> = _.mapInput((x: T) => x[0])(_.string)
    const E1: _.Equivalence<T> = _.mapInput((x: T) => x[1])(_.number)
    const eqE0E1 = _.combine(E0, E1)
    expect(eqE0E1(["a", 1, true], ["a", 1, true])).toEqual(true)
    expect(eqE0E1(["a", 1, true], ["a", 1, false])).toEqual(true)
    expect(eqE0E1(["a", 1, true], ["b", 1, true])).toEqual(false)
    expect(eqE0E1(["a", 1, true], ["a", 2, false])).toEqual(false)
  })

  it("combineMany", () => {
    type T = readonly [string, number, boolean]
    const E0: _.Equivalence<T> = _.mapInput((x: T) => x[0])(_.string)
    const E1: _.Equivalence<T> = _.mapInput((x: T) => x[1])(_.number)
    const E2: _.Equivalence<T> = _.mapInput((x: T) => x[2])(_.boolean)
    const eqE0E1E2 = _.combineMany(E0, [E1, E2])
    expect(eqE0E1E2(["a", 1, true], ["a", 1, true])).toEqual(true)
    expect(eqE0E1E2(["a", 1, true], ["b", 1, true])).toEqual(false)
    expect(eqE0E1E2(["a", 1, true], ["a", 2, true])).toEqual(false)
    expect(eqE0E1E2(["a", 1, true], ["a", 1, false])).toEqual(false)
  })

  it("combineAll", () => {
    type T = readonly [string, number, boolean]
    const E0: _.Equivalence<T> = _.mapInput((x: T) => x[0])(_.string)
    const E1: _.Equivalence<T> = _.mapInput((x: T) => x[1])(_.number)
    const E2: _.Equivalence<T> = _.mapInput((x: T) => x[2])(_.boolean)
    const eqE0E1E2 = _.combineAll([E0, E1, E2])
    expect(eqE0E1E2(["a", 1, true], ["a", 1, true])).toEqual(true)
    expect(eqE0E1E2(["a", 1, true], ["b", 1, true])).toEqual(false)
    expect(eqE0E1E2(["a", 1, true], ["a", 2, true])).toEqual(false)
    expect(eqE0E1E2(["a", 1, true], ["a", 1, false])).toEqual(false)
  })

  it("tuple", () => {
    const eq = _.tuple(_.string, _.string)
    expect(eq(["a", "b"], ["a", "b"])).toEqual(true)
    expect(eq(["a", "b"], ["c", "b"])).toEqual(false)
    expect(eq(["a", "b"], ["a", "c"])).toEqual(false)
  })
})
