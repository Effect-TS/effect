import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Boolean, pipe } from "effect"

describe("Boolean", () => {
  it("isBoolean", () => {
    assertTrue(Boolean.isBoolean(true))
    assertTrue(Boolean.isBoolean(false))
    assertFalse(Boolean.isBoolean("a"))
    assertFalse(Boolean.isBoolean(1))
  })

  it("and", () => {
    assertTrue(pipe(true, Boolean.and(true)))
    assertFalse(pipe(true, Boolean.and(false)))
    assertFalse(pipe(false, Boolean.and(true)))
    assertFalse(pipe(false, Boolean.and(false)))
  })

  it("nand", () => {
    assertFalse(pipe(true, Boolean.nand(true)))
    assertTrue(pipe(true, Boolean.nand(false)))
    assertTrue(pipe(false, Boolean.nand(true)))
    assertTrue(pipe(false, Boolean.nand(false)))
  })

  it("or", () => {
    assertTrue(pipe(true, Boolean.or(true)))
    assertTrue(pipe(true, Boolean.or(false)))
    assertTrue(pipe(false, Boolean.or(true)))
    assertFalse(pipe(false, Boolean.or(false)))
  })

  it("nor", () => {
    assertFalse(pipe(true, Boolean.nor(true)))
    assertFalse(pipe(true, Boolean.nor(false)))
    assertFalse(pipe(false, Boolean.nor(true)))
    assertTrue(pipe(false, Boolean.nor(false)))
  })

  it("xor", () => {
    assertFalse(pipe(true, Boolean.xor(true)))
    assertTrue(pipe(true, Boolean.xor(false)))
    assertTrue(pipe(false, Boolean.xor(true)))
    assertFalse(pipe(false, Boolean.xor(false)))
  })

  it("eqv", () => {
    assertTrue(pipe(true, Boolean.eqv(true)))
    assertFalse(pipe(true, Boolean.eqv(false)))
    assertFalse(pipe(false, Boolean.eqv(true)))
    assertTrue(pipe(false, Boolean.eqv(false)))
  })

  it("implies", () => {
    assertTrue(pipe(true, Boolean.implies(true)))
    assertFalse(pipe(true, Boolean.implies(false)))
    assertTrue(pipe(false, Boolean.implies(true)))
    assertTrue(pipe(false, Boolean.implies(false)))
  })

  it("not", () => {
    assertFalse(pipe(true, Boolean.not))
    assertTrue(pipe(false, Boolean.not))
  })

  it("match", () => {
    const match = Boolean.match({
      onFalse: () => "false",
      onTrue: () => "true"
    })
    deepStrictEqual(match(true), "true")
    deepStrictEqual(match(false), "false")
  })

  it("Equivalence", () => {
    assertTrue(Boolean.Equivalence(true, true))
    assertTrue(Boolean.Equivalence(false, false))
    assertFalse(Boolean.Equivalence(true, false))
    assertFalse(Boolean.Equivalence(false, true))
  })

  it("Order", () => {
    deepStrictEqual(Boolean.Order(false, true), -1)
    deepStrictEqual(Boolean.Order(true, false), 1)
    deepStrictEqual(Boolean.Order(true, true), 0)
  })

  it("every", () => {
    assertTrue(Boolean.every([true, true, true]))
    assertFalse(Boolean.every([true, false, true]))
  })

  it("some", () => {
    assertTrue(Boolean.some([true, false, true]))
    assertFalse(Boolean.some([false, false, false]))
  })
})
