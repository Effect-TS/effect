import { describe, expect, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"
import { absurd, Equal, Hash, HashSet, identity, Option, Utils } from "effect"

describe("Hash", () => {
  it("structural", () => {
    const a = { foo: { bar: "ok", baz: { arr: [0, 1, 2] } } }
    const b = { foo: { bar: "ok", baz: { arr: [0, 1, 2] } } }
    assertTrue(Hash.hash(a) !== Hash.hash(b))
    assertFalse(Equal.equals(a, b))
    Utils.structuralRegion(() => {
      strictEqual(Hash.hash(a), Hash.hash(b))
      assertTrue(Equal.equals(a, b))
    })
    assertTrue(Hash.hash(a) !== Hash.hash(b))
    assertFalse(Equal.equals(a, b))
  })
  it("structural cached", () => {
    const a = Option.some({ foo: { bar: "ok", baz: { arr: [0, 1, 2] } } })
    const b = Option.some({ foo: { bar: "ok", baz: { arr: [0, 1, 2] } } })
    assertTrue(Hash.hash(a) !== Hash.hash(b))
    assertFalse(Equal.equals(a, b))
    Utils.structuralRegion(() => {
      strictEqual(Hash.hash(a), Hash.hash(b))
      assertTrue(Equal.equals(a, b))
    })
    assertTrue(Hash.hash(a) !== Hash.hash(b))
    assertFalse(Equal.equals(a, b))
  })

  it("number", () => {
    const set: HashSet.HashSet<number> = HashSet.make(Infinity)
    assertTrue(HashSet.has(set, Infinity))
    assertFalse(HashSet.has(set, -Infinity))
    assertTrue(Hash.number(0.1) !== Hash.number(0))
  })

  it("bigint", () => {
    const set = HashSet.make(1n)
    assertTrue(HashSet.has(set, 1n))
    assertFalse(HashSet.has(set, 2n))
  })

  it("symbol", () => {
    const a = Symbol.for("effect/test/Hash/a")
    const b = Symbol.for("effect/test/Hash/b")
    const set: HashSet.HashSet<symbol> = HashSet.make(a)
    assertTrue(HashSet.has(set, a))
    assertFalse(HashSet.has(set, b))
  })

  it("undefined", () => {
    const set: HashSet.HashSet<number | undefined> = HashSet.make(1, undefined)
    assertTrue(HashSet.has(set, undefined))
    assertFalse(HashSet.has(set, 2))
  })

  it("null", () => {
    const set: HashSet.HashSet<number | null> = HashSet.make(1, null)
    assertTrue(HashSet.has(set, null))
    assertFalse(HashSet.has(set, 2))
  })

  it("function", () => {
    const set: HashSet.HashSet<Function> = HashSet.make(identity)
    assertTrue(HashSet.has(set, identity))
    assertFalse(HashSet.has(set, absurd))
  })

  it("isHash", () => {
    assertTrue(Hash.isHash(HashSet.empty()))
    assertFalse(Hash.isHash(null))
    assertFalse(Hash.isHash({}))
  })

  it("invalid Date", () => {
    const invalidDate = new Date("invalid")
    expect(() => Hash.hash(invalidDate)).not.toThrow()
  })
})
