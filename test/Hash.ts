import { absurd, identity } from "effect/Function"
import * as Hash from "effect/Hash"
import * as HashSet from "effect/HashSet"

describe.concurrent("Hash", () => {
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
