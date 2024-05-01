import * as Equal from "effect/Equal"
import { absurd, identity } from "effect/Function"
import * as Hash from "effect/Hash"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import * as Utils from "effect/Utils"
import { describe, expect, it } from "vitest"

describe("Hash", () => {
  it("structural", () => {
    const a = { foo: { bar: "ok", baz: { arr: [0, 1, 2] } } }
    const b = { foo: { bar: "ok", baz: { arr: [0, 1, 2] } } }
    expect(Hash.hash(a)).not.toBe(Hash.hash(b))
    expect(Equal.equals(a, b)).toBe(false)
    Utils.structuralRegion(() => {
      expect(Hash.hash(a)).toBe(Hash.hash(b))
      expect(Equal.equals(a, b)).toBe(true)
    })
    expect(Hash.hash(a)).not.toBe(Hash.hash(b))
    expect(Equal.equals(a, b)).toBe(false)
  })
  it("structural cached", () => {
    const a = Option.some({ foo: { bar: "ok", baz: { arr: [0, 1, 2] } } })
    const b = Option.some({ foo: { bar: "ok", baz: { arr: [0, 1, 2] } } })
    expect(Hash.hash(a)).not.toBe(Hash.hash(b))
    expect(Equal.equals(a, b)).toBe(false)
    Utils.structuralRegion(() => {
      expect(Hash.hash(a)).toBe(Hash.hash(b))
      expect(Equal.equals(a, b)).toBe(true)
    })
    expect(Hash.hash(a)).not.toBe(Hash.hash(b))
    expect(Equal.equals(a, b)).toBe(false)
  })
  it("exports", () => {
    expect(Hash.string).exist
    expect(Hash.structureKeys).exist
    expect(Hash.random).exist
  })

  it("number", () => {
    const set: HashSet.HashSet<number> = HashSet.make(Infinity)
    expect(HashSet.has(set, Infinity)).toBe(true)
    expect(HashSet.has(set, -Infinity)).toBe(false)
  })

  it("bigint", () => {
    const set = HashSet.make(1n)
    expect(HashSet.has(set, 1n)).toBe(true)
    expect(HashSet.has(set, 2n)).toBe(false)
  })

  it("symbol", () => {
    const a = Symbol.for("effect-test/Hash/a")
    const b = Symbol.for("effect-test/Hash/b")
    const set: HashSet.HashSet<symbol> = HashSet.make(a)
    expect(HashSet.has(set, a)).toBe(true)
    expect(HashSet.has(set, b)).toBe(false)
  })

  it("undefined", () => {
    const set: HashSet.HashSet<number | undefined> = HashSet.make(1, undefined)
    expect(HashSet.has(set, undefined)).toBe(true)
    expect(HashSet.has(set, 2)).toBe(false)
  })

  it("null", () => {
    const set: HashSet.HashSet<number | null> = HashSet.make(1, null)
    expect(HashSet.has(set, null)).toBe(true)
    expect(HashSet.has(set, 2)).toBe(false)
  })

  it("function", () => {
    const set: HashSet.HashSet<Function> = HashSet.make(identity)
    expect(HashSet.has(set, identity)).toBe(true)
    expect(HashSet.has(set, absurd)).toBe(false)
  })

  it("isHash", () => {
    expect(Hash.isHash(HashSet.empty())).toBe(true)
    expect(Hash.isHash(null)).toBe(false)
    expect(Hash.isHash({})).toBe(false)
  })
})
