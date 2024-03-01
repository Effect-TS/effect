import { pipe } from "effect/Function"
import * as Number from "effect/Number"
import * as String from "effect/String"
import * as Struct from "effect/Struct"
import { assert, describe, expect, it } from "vitest"

describe("Struct", () => {
  it("exports", () => {
    expect(Struct.getOrder).exist // alias of `Order.ts#struct`
  })

  it("pick", () => {
    expect(pipe({ a: "a", b: 1, c: true }, Struct.pick("a", "b"))).toEqual({ a: "a", b: 1 })
    expect(Struct.pick({ a: "a", b: 1, c: true }, "a", "b")).toEqual({ a: "a", b: 1 })

    const record1: Record<string, number> = {}
    expect(pipe(record1, Struct.pick("a", "b"))).toStrictEqual({})
    const record2: Record<string, number> = { b: 1 }
    expect(pipe(record2, Struct.pick("a", "b"))).toStrictEqual({ b: 1 })

    const optionalStringStruct1: {
      a?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    expect(pipe(optionalStringStruct1, Struct.pick("a", "b"))).toStrictEqual({ b: 1 })
    const optionalStringStruct2: {
      a?: string
      b: number
      c: boolean
    } = { a: "a", b: 1, c: true }
    expect(pipe(optionalStringStruct2, Struct.pick("a", "b"))).toStrictEqual({ a: "a", b: 1 })

    const a = Symbol.for("a")
    const optionalSymbolStruct1: {
      [a]?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    expect(pipe(optionalSymbolStruct1, Struct.pick(a, "b"))).toStrictEqual({ b: 1 })
    const optionalSymbolStruct2: {
      [a]?: string
      b: number
      c: boolean
    } = { [a]: "a", b: 1, c: true }
    expect(pipe(optionalSymbolStruct2, Struct.pick(a, "b"))).toStrictEqual({ [a]: "a", b: 1 })
  })

  it("omit", () => {
    expect(pipe({ a: "a", b: 1, c: true }, Struct.omit("c"))).toEqual({ a: "a", b: 1 })
    expect(pipe(Struct.omit({ a: "a", b: 1, c: true }, "c"))).toEqual({ a: "a", b: 1 })

    const record1: Record<string, number> = {}
    expect(pipe(record1, Struct.omit("a", "c"))).toStrictEqual({})
    const record2: Record<string, number> = { b: 1 }
    expect(pipe(record2, Struct.omit("a", "c"))).toStrictEqual({ b: 1 })

    const optionalStringStruct1: {
      a?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    expect(pipe(optionalStringStruct1, Struct.omit("c"))).toStrictEqual({ b: 1 })
    const optionalStringStruct2: {
      a?: string
      b: number
      c: boolean
    } = { a: "a", b: 1, c: true }
    expect(pipe(optionalStringStruct2, Struct.omit("c"))).toStrictEqual({ a: "a", b: 1 })

    const a = Symbol.for("a")
    const optionalSymbolStruct1: {
      [a]?: string
      b: number
      c: boolean
    } = { b: 1, c: true }
    expect(pipe(optionalSymbolStruct1, Struct.omit("c"))).toStrictEqual({ b: 1 })
    const optionalSymbolStruct2: {
      [a]?: string
      b: number
      c: boolean
    } = { [a]: "a", b: 1, c: true }
    expect(pipe(optionalSymbolStruct2, Struct.omit("c"))).toStrictEqual({ [a]: "a", b: 1 })
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

    expect(res1).toEqual({ a: 1, b: true, c: false, d: "extra" })

    const x: Record<"b", number> = Object.create({ a: 1 })
    x.b = 1
    const res2 = pipe(x, Struct.evolve({ b: (b) => b > 0 }))

    expect(res2).toEqual({ b: true })

    // dual
    const res3 = Struct.evolve({ a: 1 }, { a: (x) => x > 0 })
    expect(res3).toEqual({ a: true })
  })

  it("struct", () => {
    const PersonEquivalence = Struct.getEquivalence({
      name: String.Equivalence,
      age: Number.Equivalence
    })

    assert.deepStrictEqual(
      PersonEquivalence({ name: "John", age: 25 }, { name: "John", age: 25 }),
      true
    )
    assert.deepStrictEqual(
      PersonEquivalence({ name: "John", age: 25 }, { name: "John", age: 40 }),
      false
    )
  })

  it("get", () => {
    expect(pipe({ a: 1 }, Struct.get("a"))).toStrictEqual(1)
    expect(pipe({}, Struct.get("a"))).toStrictEqual(undefined)
  })
})
