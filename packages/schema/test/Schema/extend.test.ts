import * as Arbitrary from "@effect/schema/Arbitrary"
import * as FastCheck from "@effect/schema/FastCheck"
import * as Schema from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

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
        Schema.filter((input) => input.b > 0, { message: () => "R filter" })
      )
      const schema = Schema.extend(S, R)
      expect(String(schema)).toBe(`{ { readonly a: string; readonly b: number } | filter }`)
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: -1 },
        `R filter`
      )
    })

    it("S extends RR (two filters)", async () => {
      const S = Schema.Struct({ a: Schema.String })
      const RR = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b > 0, { message: () => "filter1" }),
        Schema.filter((input) => input.b < 10, { message: () => "filter2" })
      )
      const schema = Schema.extend(S, RR)
      expect(String(schema)).toBe(`{ { { readonly a: string; readonly b: number } | filter } | filter }`)
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: -1 },
        `filter1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: 11 },
        `filter2`
      )
    })

    it("R1 extends R2", async () => {
      const R1 = Schema.Struct({ a: Schema.String }).pipe(
        Schema.filter((input) => input.a.length > 0, { message: () => "R1 filter" })
      )
      const R2 = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b > 0, { message: () => "R2 filter" })
      )
      const schema = Schema.extend(R1, R2)
      expect(String(schema)).toBe(`{ { { readonly a: string; readonly b: number } | filter } | filter }`)
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "", b: 1 },
        `R1 filter`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: -1 },
        `R2 filter`
      )
    })

    it("(S1 | S2) extends R2", async () => {
      const S1 = Schema.Struct({ a: Schema.String })
      const S2 = Schema.Struct({ b: Schema.Number })
      const R = Schema.Struct({ c: Schema.Boolean }).pipe(
        Schema.filter((input) => input.c === true, { message: () => "R filter" })
      )
      const schema = Schema.extend(Schema.Union(S1, S2), R)
      expect(String(schema)).toBe(
        `{ { readonly c: boolean; readonly a: string } | filter } | { { readonly c: boolean; readonly b: number } | filter }`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", c: false },
        `{ { readonly c: boolean; readonly a: string } | filter } | { { readonly c: boolean; readonly b: number } | filter }
├─ Union member
│  └─ R filter
└─ Union member
   └─ { { readonly c: boolean; readonly b: number } | filter }
      └─ From side refinement failure
         └─ { readonly c: boolean; readonly b: number }
            └─ ["b"]
               └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: 1, c: false },
        `{ { readonly c: boolean; readonly a: string } | filter } | { { readonly c: boolean; readonly b: number } | filter }
├─ Union member
│  └─ { { readonly c: boolean; readonly a: string } | filter }
│     └─ From side refinement failure
│        └─ { readonly c: boolean; readonly a: string }
│           └─ ["a"]
│              └─ is missing
└─ Union member
   └─ R filter`
      )
    })

    it("(R1 | R2) extends R3", async () => {
      const R1 = Schema.Struct({ a: Schema.String }).pipe(
        Schema.filter((input) => input.a.length > 0, { message: () => "R1 filter" })
      )
      const R2 = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b > 0, { message: () => "R2 filter" })
      )
      const R3 = Schema.Struct({ c: Schema.Boolean }).pipe(
        Schema.filter((input) => input.c === true, { message: () => "R3 filter" })
      )
      const schema = Schema.extend(Schema.Union(R1, R2), R3)
      expect(String(schema)).toBe(
        `{ { { readonly c: boolean; readonly a: string } | filter } | filter } | { { { readonly c: boolean; readonly b: number } | filter } | filter }`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "", c: true },
        `{ { { readonly c: boolean; readonly a: string } | filter } | filter } | { { { readonly c: boolean; readonly b: number } | filter } | filter }
├─ Union member
│  └─ R1 filter
└─ Union member
   └─ { { { readonly c: boolean; readonly b: number } | filter } | filter }
      └─ From side refinement failure
         └─ { { readonly c: boolean; readonly b: number } | filter }
            └─ From side refinement failure
               └─ { readonly c: boolean; readonly b: number }
                  └─ ["b"]
                     └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: -1, c: true },
        `{ { { readonly c: boolean; readonly a: string } | filter } | filter } | { { { readonly c: boolean; readonly b: number } | filter } | filter }
├─ Union member
│  └─ { { { readonly c: boolean; readonly a: string } | filter } | filter }
│     └─ From side refinement failure
│        └─ { { readonly c: boolean; readonly a: string } | filter }
│           └─ From side refinement failure
│              └─ { readonly c: boolean; readonly a: string }
│                 └─ ["a"]
│                    └─ is missing
└─ Union member
   └─ R2 filter`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", c: false },
        `{ { { readonly c: boolean; readonly a: string } | filter } | filter } | { { { readonly c: boolean; readonly b: number } | filter } | filter }
├─ Union member
│  └─ R3 filter
└─ Union member
   └─ { { { readonly c: boolean; readonly b: number } | filter } | filter }
      └─ From side refinement failure
         └─ { { readonly c: boolean; readonly b: number } | filter }
            └─ From side refinement failure
               └─ { readonly c: boolean; readonly b: number }
                  └─ ["b"]
                     └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: 1, c: false },
        `{ { { readonly c: boolean; readonly a: string } | filter } | filter } | { { { readonly c: boolean; readonly b: number } | filter } | filter }
├─ Union member
│  └─ { { { readonly c: boolean; readonly a: string } | filter } | filter }
│     └─ From side refinement failure
│        └─ { { readonly c: boolean; readonly a: string } | filter }
│           └─ From side refinement failure
│              └─ { readonly c: boolean; readonly a: string }
│                 └─ ["a"]
│                    └─ is missing
└─ Union member
   └─ R3 filter`
      )
    })
  })

  describe("suspend", () => {
    it("List", async () => {
      type List = {
        readonly type: "nil"
      } | {
        readonly type: "cons"
        readonly tail: {
          readonly value: number
        } & List
      }
      const List: Schema.Schema<List> = Schema.Union(
        Schema.Struct({ type: Schema.Literal("nil") }),
        Schema.Struct({
          type: Schema.Literal("cons"),
          tail: Schema.extend(
            Schema.Struct({ value: Schema.Number }),
            Schema.suspend(() => List)
          )
        })
      )
      expect(String(List)).toStrictEqual(
        `{ readonly type: "nil" } | { readonly type: "cons"; readonly tail: <suspended schema> }`
      )
      await Util.expectDecodeUnknownSuccess(List, { type: "nil" })
      await Util.expectDecodeUnknownSuccess(List, { type: "cons", tail: { value: 1, type: "nil" } })
      await Util.expectDecodeUnknownSuccess(List, {
        type: "cons",
        tail: { value: 1, type: "cons", tail: { value: 2, type: "nil" } }
      })
      const decodeUnknownSync = Schema.decodeUnknownSync(List)
      const arb = Arbitrary.make(List)
      FastCheck.assert(
        FastCheck.property(arb, (a) => {
          decodeUnknownSync(a)
        }),
        { numRuns: 10 }
      )
    })
  })

  it("errors", () => {
    expect(() => Schema.String.pipe(Schema.extend(Schema.Number))).toThrow(
      new Error("extend: unsupported schema or overlapping types, cannot extend string with number")
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
    ).toThrow(
      new Error(`extend: unsupported schema or overlapping types, cannot extend "a" with string (path ["a"])`)
    )
    expect(() =>
      Schema.Struct({ a: Schema.Literal("a") }).pipe(
        Schema.extend(
          Schema.Union(
            Schema.Struct({ a: Schema.String }),
            Schema.Struct({ b: Schema.Number })
          )
        )
      )
    ).toThrow(
      new Error(`extend: unsupported schema or overlapping types, cannot extend "a" with string (path ["a"])`)
    )
    expect(() =>
      Schema.extend(
        Schema.Struct({ a: Schema.Struct({ b: Schema.String }) }),
        Schema.Struct({ a: Schema.Struct({ b: Schema.Number }) })
      )
    )
      .toThrow(
        new Error(
          `extend: unsupported schema or overlapping types, cannot extend string with number (path ["a", "b"])`
        )
      )
  })
})
