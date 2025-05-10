import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { Equivalence, pipe } from "effect"

describe("Equivalence", () => {
  it("array", () => {
    const eq = Equivalence.array(Equivalence.number)

    assertTrue(eq([], []))
    assertTrue(eq([1, 2, 3], [1, 2, 3]))
    assertFalse(eq([1, 2, 3], [1, 2, 4]))
    assertFalse(eq([1, 2, 3], [1, 2]))
  })

  it("strict returns an Equivalence that uses strict equality (===) to compare values", () => {
    const eq = Equivalence.strict<{ a: number }>()
    const a = { a: 1 }
    assertTrue(eq(a, a))
    assertFalse(eq({ a: 1 }, { a: 1 }))
  })

  it("mapInput", () => {
    interface Person {
      readonly name: string
      readonly age: number
    }
    const eqPerson = pipe(Equivalence.string, Equivalence.mapInput((p: Person) => p.name))
    assertTrue(eqPerson({ name: "a", age: 1 }, { name: "a", age: 2 }))
    assertTrue(eqPerson({ name: "a", age: 1 }, { name: "a", age: 1 }))
    assertFalse(eqPerson({ name: "a", age: 1 }, { name: "b", age: 1 }))
    assertFalse(eqPerson({ name: "a", age: 1 }, { name: "b", age: 2 }))
  })

  it("Date", () => {
    const eq = Equivalence.Date
    assertTrue(eq(new Date(0), new Date(0)))
    assertFalse(eq(new Date(0), new Date(1)))
    assertFalse(eq(new Date(1), new Date(0)))
  })

  it("product", () => {
    const eq = Equivalence.product(Equivalence.string, Equivalence.string)
    assertTrue(eq(["a", "b"], ["a", "b"]))
    assertFalse(eq(["a", "b"], ["c", "b"]))
    assertFalse(eq(["a", "b"], ["a", "c"]))
  })

  it("productMany", () => {
    const eq = Equivalence.productMany(Equivalence.string, [Equivalence.string])
    assertTrue(eq(["a", "b"], ["a", "b"]))
    assertTrue(eq(["a", "b"], ["a", "b", "c"]))
    assertTrue(eq(["a", "b", "c"], ["a", "b"]))
    assertFalse(eq(["a", "b"], ["c", "b"]))
    assertFalse(eq(["a", "b"], ["a", "c"]))
  })

  it("all", () => {
    const eq = Equivalence.all([Equivalence.string, Equivalence.string])
    assertTrue(eq([], []))
    assertTrue(eq([], ["a"]))
    assertTrue(eq(["a"], []))
    assertTrue(eq(["a"], ["a"]))
    assertFalse(eq(["a"], ["b"]))
    assertTrue(eq(["a"], ["a", "b"]))
    assertTrue(eq(["a", "b"], ["a"]))
    assertTrue(eq(["a", "b"], ["a", "b"]))
    assertFalse(eq(["a", "b"], ["a", "c"]))
  })

  it("combine", () => {
    type T = readonly [string, number, boolean]
    const E0: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[0])(Equivalence.string)
    const E1: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[1])(Equivalence.number)
    const eqE0E1 = Equivalence.combine(E0, E1)
    assertTrue(eqE0E1(["a", 1, true], ["a", 1, true]))
    assertTrue(eqE0E1(["a", 1, true], ["a", 1, false]))
    assertFalse(eqE0E1(["a", 1, true], ["b", 1, true]))
    assertFalse(eqE0E1(["a", 1, true], ["a", 2, false]))
  })

  it("combineMany", () => {
    type T = readonly [string, number, boolean]
    const E0: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[0])(Equivalence.string)
    const E1: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[1])(Equivalence.number)
    const E2: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[2])(Equivalence.boolean)
    const eqE0E1E2 = Equivalence.combineMany(E0, [E1, E2])
    assertTrue(eqE0E1E2(["a", 1, true], ["a", 1, true]))
    assertFalse(eqE0E1E2(["a", 1, true], ["b", 1, true]))
    assertFalse(eqE0E1E2(["a", 1, true], ["a", 2, true]))
    assertFalse(eqE0E1E2(["a", 1, true], ["a", 1, false]))
  })

  it("combineAll", () => {
    type T = readonly [string, number, boolean]
    const E0: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[0])(Equivalence.string)
    const E1: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[1])(Equivalence.number)
    const E2: Equivalence.Equivalence<T> = Equivalence.mapInput((x: T) => x[2])(Equivalence.boolean)
    const eqE0E1E2 = Equivalence.combineAll([E0, E1, E2])
    assertTrue(eqE0E1E2(["a", 1, true], ["a", 1, true]))
    assertFalse(eqE0E1E2(["a", 1, true], ["b", 1, true]))
    assertFalse(eqE0E1E2(["a", 1, true], ["a", 2, true]))
    assertFalse(eqE0E1E2(["a", 1, true], ["a", 1, false]))
  })

  it("tuple", () => {
    const eq = Equivalence.tuple(Equivalence.string, Equivalence.string)
    assertTrue(eq(["a", "b"], ["a", "b"]))
    assertFalse(eq(["a", "b"], ["c", "b"]))
    assertFalse(eq(["a", "b"], ["a", "c"]))
  })
})
