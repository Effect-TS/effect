import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Number, pipe, String, Struct } from "effect"

describe("Struct", () => {
  it("pick", () => {
    deepStrictEqual(pipe({ a: "a", b: 1, c: true }, Struct.pick("a", "b")), { a: "a", b: 1 })
    deepStrictEqual(Struct.pick({ a: "a", b: 1, c: true }, "a", "b"), { a: "a", b: 1 })

    const record1: Record<string, number> = {}
    deepStrictEqual(pipe(record1, Struct.pick("a", "b")), {})
    const record2: Record<string, number> = { b: 1 }
    deepStrictEqual(pipe(record2, Struct.pick("a", "b")), { b: 1 })

    const optionalStringStruct1: {
      a?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    deepStrictEqual(pipe(optionalStringStruct1, Struct.pick("a", "b")), { b: 1 })
    const optionalStringStruct2: {
      a?: string
      b: number
      c: boolean
    } = { a: "a", b: 1, c: true }
    deepStrictEqual(pipe(optionalStringStruct2, Struct.pick("a", "b")), { a: "a", b: 1 })

    const a = Symbol.for("a")
    const optionalSymbolStruct1: {
      [a]?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    deepStrictEqual(pipe(optionalSymbolStruct1, Struct.pick(a, "b")), { b: 1 })
    const optionalSymbolStruct2: {
      [a]?: string
      b: number
      c: boolean
    } = { [a]: "a", b: 1, c: true }
    deepStrictEqual(pipe(optionalSymbolStruct2, Struct.pick(a, "b")), { [a]: "a", b: 1 })
  })

  it("omit", () => {
    deepStrictEqual(pipe({ a: "a", b: 1, c: true }, Struct.omit("c")), { a: "a", b: 1 })
    deepStrictEqual(Struct.omit({ a: "a", b: 1, c: true }, "c"), { a: "a", b: 1 })

    const record1: Record<string, number> = {}
    deepStrictEqual(pipe(record1, Struct.omit("a", "c")), {})
    const record2: Record<string, number> = { b: 1 }
    deepStrictEqual(pipe(record2, Struct.omit("a", "c")), { b: 1 })

    const optionalStringStruct1: {
      a?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    deepStrictEqual(pipe(optionalStringStruct1, Struct.omit("c")), { b: 1 })
    const optionalStringStruct2: {
      a?: string
      b: number
      c: boolean
    } = { a: "a", b: 1, c: true }
    deepStrictEqual(pipe(optionalStringStruct2, Struct.omit("c")), { a: "a", b: 1 })

    const a = Symbol.for("a")
    const optionalSymbolStruct1: {
      [a]?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    deepStrictEqual(pipe(optionalSymbolStruct1, Struct.omit("c")), { b: 1 })
    const optionalSymbolStruct2: {
      [a]?: string
      b: number
      c: boolean
    } = { [a]: "a", b: 1, c: true }
    deepStrictEqual(pipe(optionalSymbolStruct2, Struct.omit("c")), { [a]: "a", b: 1 })
  })

  it("evolve", () => {
    const res1 = pipe(
      { a: "a", b: 1, c: true, d: "extra" },
      Struct.evolve({
        a: (s) => s.length,
        b: (b) => b > 0,
        c: (c) => !c
      })
    )

    deepStrictEqual(res1, { a: 1, b: true, c: false, d: "extra" })

    const x: Record<"b", number> = Object.create({ a: 1 })
    x.b = 1
    const res2 = pipe(x, Struct.evolve({ b: (b) => b > 0 }))

    deepStrictEqual(res2, { b: true })

    // dual
    const res3 = Struct.evolve({ a: 1 }, { a: (x) => x > 0 })
    deepStrictEqual(res3, { a: true })
  })

  it("struct", () => {
    const PersonEquivalence = Struct.getEquivalence({
      name: String.Equivalence,
      age: Number.Equivalence
    })

    deepStrictEqual(
      PersonEquivalence({ name: "John", age: 25 }, { name: "John", age: 25 }),
      true
    )
    deepStrictEqual(
      PersonEquivalence({ name: "John", age: 25 }, { name: "John", age: 40 }),
      false
    )
  })

  it("get", () => {
    strictEqual(pipe({ a: 1 }, Struct.get("a")), 1)
    strictEqual(pipe({}, Struct.get("a")), undefined)
  })

  it("entries", () => {
    const c = Symbol("c")
    // should not include symbol keys
    deepStrictEqual(Struct.entries({ a: "a", b: 1, [c]: 2 }), [["a", "a"], ["b", 1]])
  })
})
