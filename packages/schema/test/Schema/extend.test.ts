import * as Schema from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("extend", () => {
  it(`struct extend struct (dual)`, async () => {
    const schema = Schema.extend(Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.Number }))
    expect(String(schema)).toBe("{ readonly a: string; readonly b: number }")
  })

  it(`struct with defaults extend struct`, async () => {
    const schema = Schema.Struct({
      a: Schema.optional(Schema.String, { exact: true, default: () => "" }),
      b: Schema.String
    }).pipe(Schema.extend(Schema.Struct({ c: Schema.Number })))
    expect(String(schema)).toBe(
      "({ readonly a?: string; readonly b: string; readonly c: number } <-> { readonly a: string; readonly b: string; readonly c: number })"
    )
  })

  it(`struct extend struct with defaults`, async () => {
    const schema = Schema.Struct({ a: Schema.Number }).pipe(
      Schema.extend(
        Schema.Struct({ b: Schema.String, c: Schema.optional(Schema.String, { exact: true, default: () => "" }) })
      )
    )
    expect(String(schema)).toBe(
      "({ readonly a: number; readonly b: string; readonly c?: string } <-> { readonly a: number; readonly b: string; readonly c: string })"
    )
  })

  it(`struct with defaults extend struct with defaults `, async () => {
    const schema = Schema.Struct({
      a: Schema.optional(Schema.String, { exact: true, default: () => "" }),
      b: Schema.String
    }).pipe(
      Schema.extend(
        Schema.Struct({
          c: Schema.optional(Schema.Number, { exact: true, default: () => 0 }),
          d: Schema.Boolean
        })
      )
    )
    expect(String(schema)).toBe(
      "({ readonly d: boolean; readonly a?: string; readonly b: string; readonly c?: number } <-> { readonly d: boolean; readonly a: string; readonly b: string; readonly c: number })"
    )
  })

  it(`union with defaults extend union with defaults `, async () => {
    const schema = Schema.Union(
      Schema.Struct({
        a: Schema.optional(Schema.String, { exact: true, default: () => "a" }),
        b: Schema.String
      }),
      Schema.Struct({
        c: Schema.optional(Schema.String, { exact: true, default: () => "c" }),
        d: Schema.String
      })
    ).pipe(
      Schema.extend(
        Schema.Union(
          Schema.Struct({
            e: Schema.optional(Schema.String, { exact: true, default: () => "e" }),
            f: Schema.String
          }),
          Schema.Struct({
            g: Schema.optional(Schema.String, { exact: true, default: () => "g" }),
            h: Schema.String
          })
        )
      )
    )
    expect(String(schema)).toBe(
      "({ readonly a?: string; readonly b: string; readonly e?: string; readonly f: string } <-> { readonly a: string; readonly b: string; readonly e: string; readonly f: string }) | ({ readonly a?: string; readonly b: string; readonly g?: string; readonly h: string } <-> { readonly a: string; readonly b: string; readonly g: string; readonly h: string }) | ({ readonly c?: string; readonly d: string; readonly e?: string; readonly f: string } <-> { readonly c: string; readonly d: string; readonly e: string; readonly f: string }) | ({ readonly c?: string; readonly d: string; readonly g?: string; readonly h: string } <-> { readonly c: string; readonly d: string; readonly g: string; readonly h: string })"
    )
  })

  it(`struct extend union`, () => {
    const schema = Schema.Struct({ b: Schema.Boolean }).pipe(
      Schema.extend(Schema.Union(
        Schema.Struct({ a: Schema.Literal("a") }),
        Schema.Struct({ a: Schema.Literal("b") })
      ))
    )
    expect(String(schema)).toBe(`{ readonly a: "a"; readonly b: boolean } | { readonly a: "b"; readonly b: boolean }`)
  })

  it(`union extend struct`, () => {
    const schema = Schema.Union(
      Schema.Struct({ a: Schema.Literal("a") }),
      Schema.Struct({ b: Schema.Literal("b") })
    ).pipe(Schema.extend(Schema.Struct({ c: Schema.Boolean })))
    expect(String(schema)).toBe(`{ readonly a: "a"; readonly c: boolean } | { readonly b: "b"; readonly c: boolean }`)
  })

  it(`nested union extends struct`, () => {
    const schema = Schema.Union(
      Schema.Union(
        Schema.Struct({ a: Schema.Literal("a") }),
        Schema.Struct({ a: Schema.Literal("b") })
      ),
      Schema.Struct({ b: Schema.Literal("b") })
    ).pipe(
      Schema.extend(Schema.Struct({ c: Schema.Boolean }))
    )
    expect(String(schema)).toBe(
      `{ readonly a: "a"; readonly c: boolean } | { readonly a: "b"; readonly c: boolean } | { readonly b: "b"; readonly c: boolean }`
    )
  })

  it(`union extend union`, () => {
    const schema = Schema.Union(
      Schema.Struct({ a: Schema.Literal("a") }),
      Schema.Struct({ a: Schema.Literal("b") })
    ).pipe(
      Schema.extend(
        Schema.Union(
          Schema.Struct({ c: Schema.Boolean }),
          Schema.Struct({ d: Schema.Number })
        )
      )
    )
    expect(String(schema)).toBe(
      `{ readonly a: "a"; readonly c: boolean } | { readonly a: "a"; readonly d: number } | { readonly a: "b"; readonly c: boolean } | { readonly a: "b"; readonly d: number }`
    )
  })

  it("struct extend record(string, string)", async () => {
    const schema = Schema.Struct({ a: Schema.String }).pipe(
      Schema.extend(Schema.Record(Schema.String, Schema.String))
    )
    expect(String(schema)).toBe(`{ readonly a: string; readonly [x: string]: string }`)
  })

  it("struct extend record(templateLiteral, string)", async () => {
    const schema = Schema.Struct({ a: Schema.String }).pipe(
      Schema.extend(Schema.Record(
        Schema.TemplateLiteral(
          Schema.String,
          Schema.Literal("-"),
          Schema.Number
        ),
        Schema.String
      ))
    )
    // type A = {
    //   [x: `${string}-${number}`]: string
    //   readonly a: string
    // }
    // const a: A = { a: "a" } // OK
    expect(String(schema)).toBe("{ readonly a: string; readonly [x: `${string}-${number}`]: string }")
  })

  describe("both operands are transformations", () => {
    const BoolFromString = Schema.transform(
      Schema.String,
      Schema.Boolean,
      { decode: (x) => !!x, encode: (x) => "" + x }
    )

    it("optional, transformation", async () => {
      const schema = Schema.Struct({
        a: Schema.optional(Schema.Boolean, { exact: true, default: () => true })
      }).pipe(
        Schema.extend(
          Schema.Struct({
            b: Schema.Array(BoolFromString)
          })
        )
      )
      expect(String(schema)).toBe(
        `({ readonly a?: boolean; readonly b: ReadonlyArray<(string <-> boolean)> } <-> { readonly a: boolean; readonly b: ReadonlyArray<boolean> })`
      )
    })

    it("transformation, optional", async () => {
      const schema = Schema.Struct({
        b: Schema.Array(BoolFromString)
      }).pipe(
        Schema.extend(
          Schema.Struct({
            a: Schema.optional(Schema.Boolean, { exact: true, default: () => true })
          })
        )
      )
      expect(String(schema)).toBe(
        `({ readonly a?: boolean; readonly b: ReadonlyArray<(string <-> boolean)> } <-> { readonly a: boolean; readonly b: ReadonlyArray<boolean> })`
      )
    })
  })

  it(`nested struct extend nested struct`, async () => {
    const A = Schema.Struct({ a: Schema.Struct({ b: Schema.String }) })
    const B = Schema.Struct({ a: Schema.Struct({ c: Schema.Number }) })
    const schema = Schema.extend(A, B)
    expect(String(schema)).toBe(`{ readonly a: { readonly b: string; readonly c: number } }`)
  })

  it("struct + record(string, NumberFromChar)", async () => {
    const schema = Schema.Struct({ a: Schema.Number }).pipe(
      Schema.extend(Schema.Record(Schema.String, Util.NumberFromChar))
    )
    expect(String(schema)).toBe(`{ readonly a: number; readonly [x: string]: NumberFromChar }`)
  })

  it("struct + record(symbol, NumberFromChar)", async () => {
    const schema = Schema.Struct({ a: Schema.Number }).pipe(
      Schema.extend(Schema.Record(Schema.SymbolFromSelf, Util.NumberFromChar))
    )
    expect(String(schema)).toBe(`{ readonly a: number; readonly [x: symbol]: NumberFromChar }`)
  })

  describe("refinements", () => {
    it("S extends R", async () => {
      const S = Schema.Struct({ a: Schema.String })
      const R = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b <= 0 ? "R filter" : undefined)
      )
      const schema = Schema.extend(S, R)
      expect(String(schema)).toBe(`{ { readonly a: string; readonly b: number } | filter }`)
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: -1 },
        `{ { readonly a: string; readonly b: number } | filter }
└─ Predicate refinement failure
   └─ R filter`
      )
    })

    it("S extends RR (two filters)", async () => {
      const S = Schema.Struct({ a: Schema.String })
      const RR = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b <= 0 ? "filter1" : undefined),
        Schema.filter((input) => input.b >= 10 ? "filter2" : undefined)
      )
      const schema = Schema.extend(S, RR)
      expect(String(schema)).toBe(`{ { readonly a: string; readonly b: number } | filter }`)
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: -1 },
        `{ { readonly a: string; readonly b: number } | filter }
└─ Predicate refinement failure
   └─ filter1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: 11 },
        `{ { readonly a: string; readonly b: number } | filter }
└─ Predicate refinement failure
   └─ filter2`
      )
    })

    it("R1 extends R2", async () => {
      const R1 = Schema.Struct({ a: Schema.String }).pipe(
        Schema.filter((input) => input.a.length === 0 ? "R1 filter" : undefined)
      )
      const R2 = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b <= 0 ? "R2 filter" : undefined)
      )
      const schema = Schema.extend(R1, R2)
      expect(String(schema)).toBe(
        `{ { readonly a: string; readonly b: number } | filter }`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "", b: 1 },
        `{ { readonly a: string; readonly b: number } | filter }
└─ Predicate refinement failure
   └─ R1 filter`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: -1 },
        `{ { readonly a: string; readonly b: number } | filter }
└─ Predicate refinement failure
   └─ R2 filter`
      )
    })

    it("(S1 | S2) extends R2", async () => {
      const S1 = Schema.Struct({ a1: Schema.String })
      const S2 = Schema.Struct({ a2: Schema.String })
      const U = Schema.Union(S1, S2)
      const R = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b <= 0 ? "R filter" : undefined)
      )
      const schema = Schema.extend(U, R)
      expect(String(schema)).toBe(
        `{ { readonly a1: string; readonly b: number } | filter } | { { readonly a2: string; readonly b: number } | filter }`
      )
    })
  })

  it("errors", () => {
    expect(() => Schema.String.pipe(Schema.extend(Schema.Number))).toThrow(
      new Error("Extend: cannot extend `string` with `number`")
    )
    expect(() =>
      Schema.Record(Schema.String, Schema.Number).pipe(
        Schema.extend(Schema.Record(Schema.String, Schema.Boolean))
      )
    ).toThrow(new Error("Duplicate index signature for type `string`"))
    expect(() =>
      Schema.Record(Schema.SymbolFromSelf, Schema.Number).pipe(
        Schema.extend(Schema.Record(Schema.SymbolFromSelf, Schema.Boolean))
      )
    ).toThrow(new Error("Duplicate index signature for type `symbol`"))
    expect(() =>
      Schema.Record(Schema.String, Schema.Number).pipe(
        Schema.extend(Schema.Record(Schema.String.pipe(Schema.minLength(2)), Schema.Boolean))
      )
    ).toThrow(new Error("Duplicate index signature for type `string`"))
    expect(() =>
      Schema.Struct({ a: Schema.Literal("a") }).pipe(
        Schema.extend(Schema.Struct({ a: Schema.String }))
      )
    ).toThrow(new Error("Extend: cannot extend `\"a\"` with `string` (path [\"a\"])"))
    expect(() =>
      Schema.Struct({ a: Schema.Literal("a") }).pipe(
        Schema.extend(
          Schema.Union(
            Schema.Struct({ a: Schema.String }),
            Schema.Struct({ b: Schema.Number })
          )
        )
      )
    ).toThrow(new Error("Extend: cannot extend `\"a\"` with `string` (path [\"a\"])"))
    expect(() =>
      Schema.extend(
        Schema.Struct({ a: Schema.Struct({ b: Schema.String }) }),
        Schema.Struct({ a: Schema.Struct({ b: Schema.Number }) })
      )
    )
      .toThrow(new Error("Extend: cannot extend `string` with `number` (path [\"a\", \"b\"])"))
  })
})
