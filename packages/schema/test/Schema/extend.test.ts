import * as Arbitrary from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as FastCheck from "@effect/schema/FastCheck"
import * as Schema from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("extend", () => {
  describe("String", () => {
    it("String and String", () => {
      const schema = Schema.extend(Schema.String, Schema.String)
      expect(schema.ast).toStrictEqual(Schema.String.ast)
    })

    it("String and Literal", () => {
      const literal = Schema.Literal("a")
      const schema = Schema.extend(Schema.String, literal)
      expect(schema.ast).toStrictEqual(literal.ast)
    })

    it("Literal and String", () => {
      const literal = Schema.Literal("a")
      const schema = Schema.extend(literal, Schema.String)
      expect(schema.ast).toStrictEqual(literal.ast)
    })

    it("(String and annotations) and String", () => {
      const A = Schema.String.annotations({ identifier: "A" })
      const schema = Schema.extend(A, Schema.String)
      expect(schema.ast === A.ast).toBe(true)
    })

    it("String and Refinement", () => {
      const schema = Schema.extend(
        Schema.String,
        Schema.String.pipe(Schema.startsWith("start:"))
      )
      expect(schema.ast._tag).toBe("Refinement")
      expect((schema.ast as AST.Refinement).from === AST.stringKeyword).toBe(true)
    })

    it("should support two refined brands", () => {
      const startsWith = Schema.String.pipe(Schema.startsWith("start:"), Schema.brand("start:"))
      const endsWith = Schema.String.pipe(Schema.endsWith(":end"), Schema.brand(":end"))
      const schema = Schema.extend(startsWith, endsWith)
      expect(String(schema.ast)).toBe(`a string ending with ":end" & Brand<":end">`)
      expect(schema.ast.annotations[AST.BrandAnnotationId]).toStrictEqual([":end"])
      const from = (schema.ast as AST.Refinement).from
      expect(from.annotations[AST.BrandAnnotationId]).toStrictEqual(["start:"])
      const fromfrom = (from as AST.Refinement).from
      expect(fromfrom === AST.stringKeyword).toBe(true)
    })
  })

  describe("Number", () => {
    it("Number and Number", () => {
      const schema = Schema.extend(Schema.Number, Schema.Number)
      expect(schema.ast).toStrictEqual(Schema.Number.ast)
    })

    it("Number and Literal", () => {
      const literal = Schema.Literal(1)
      const schema = Schema.extend(Schema.Number, literal)
      expect(schema.ast).toStrictEqual(literal.ast)
    })

    it("Literal and Number", () => {
      const literal = Schema.Literal(1)
      const schema = Schema.extend(literal, Schema.Number)
      expect(schema.ast).toStrictEqual(literal.ast)
    })

    it("(Number and annotations) and Number", () => {
      const A = Schema.Number.annotations({ identifier: "A" })
      const schema = Schema.extend(A, Schema.Number)
      expect(schema.ast === A.ast).toBe(true)
    })

    it("Number and Refinement", () => {
      const schema = Schema.extend(
        Schema.Number,
        Schema.Number.pipe(Schema.greaterThan(0))
      )
      expect(schema.ast._tag).toBe("Refinement")
      expect((schema.ast as AST.Refinement).from === AST.numberKeyword).toBe(true)
    })

    it("should support two refined brands", () => {
      const gt0 = Schema.Number.pipe(Schema.greaterThan(0), Schema.brand("> 0"))
      const lt2 = Schema.Number.pipe(Schema.lessThan(2), Schema.brand("< 2"))
      const schema = Schema.extend(gt0, lt2)
      expect(String(schema.ast)).toBe(`a number less than 2 & Brand<"< 2">`)
      expect(schema.ast.annotations[AST.BrandAnnotationId]).toStrictEqual(["< 2"])
      const from = (schema.ast as AST.Refinement).from
      expect(from.annotations[AST.BrandAnnotationId]).toStrictEqual(["> 0"])
      const fromfrom = (from as AST.Refinement).from
      expect(fromfrom === AST.numberKeyword).toBe(true)
    })
  })

  describe("Boolean", () => {
    it("Boolean and Boolean", () => {
      const schema = Schema.extend(Schema.Boolean, Schema.Boolean)
      expect(schema.ast).toStrictEqual(Schema.Boolean.ast)
    })

    it("Boolean and Literal", () => {
      const literal = Schema.Literal(true)
      const schema = Schema.extend(Schema.Boolean, literal)
      expect(schema.ast).toStrictEqual(literal.ast)
    })

    it("Literal and Boolean", () => {
      const literal = Schema.Literal(true)
      const schema = Schema.extend(literal, Schema.Boolean)
      expect(schema.ast).toStrictEqual(literal.ast)
    })
  })

  describe("Struct", () => {
    it("extend struct", async () => {
      const schema = Schema.extend(Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.Number }))
      expect(String(schema)).toBe("{ readonly a: string; readonly b: number }")
    })

    it("extend TypeLiteralTransformation", async () => {
      const schema = Schema.Struct({ a: Schema.Number }).pipe(
        Schema.extend(
          Schema.Struct({ b: Schema.String, c: Schema.optionalWith(Schema.String, { exact: true, default: () => "" }) })
        )
      )
      expect(String(schema)).toBe(
        "({ readonly a: number; readonly b: string; readonly c?: string } <-> { readonly a: number; readonly b: string; readonly c: string })"
      )
    })

    it("extend Union", () => {
      const schema = Schema.Struct({ b: Schema.Boolean }).pipe(
        Schema.extend(Schema.Union(
          Schema.Struct({ a: Schema.Literal("a") }),
          Schema.Struct({ a: Schema.Literal("b") })
        ))
      )
      expect(String(schema)).toBe(`{ readonly b: boolean; readonly a: "a" } | { readonly b: boolean; readonly a: "b" }`)
    })

    it("extend Record(string, string)", async () => {
      const schema = Schema.Struct({ a: Schema.String }).pipe(
        Schema.extend(Schema.Record({ key: Schema.String, value: Schema.String }))
      )
      expect(String(schema)).toBe(`{ readonly a: string; readonly [x: string]: string }`)
    })

    it("extend Record(templateLiteral, string)", async () => {
      const schema = Schema.Struct({ a: Schema.String }).pipe(
        Schema.extend(Schema.Record(
          {
            key: Schema.TemplateLiteral(
              Schema.String,
              Schema.Literal("-"),
              Schema.Number
            ),
            value: Schema.String
          }
        ))
      )
      // type A = {
      //   [x: `${string}-${number}`]: string
      //   readonly a: string
      // }
      // const a: A = { a: "a" } // OK
      expect(String(schema)).toBe("{ readonly a: string; readonly [x: `${string}-${number}`]: string }")
    })

    it("extend Record(string, NumberFromChar)", async () => {
      const schema = Schema.Struct({ a: Schema.Number }).pipe(
        Schema.extend(Schema.Record({ key: Schema.String, value: Util.NumberFromChar }))
      )
      expect(String(schema)).toBe(`{ readonly a: number; readonly [x: string]: NumberFromChar }`)
    })

    it("extend Record(symbol, NumberFromChar)", async () => {
      const schema = Schema.Struct({ a: Schema.Number }).pipe(
        Schema.extend(Schema.Record({ key: Schema.SymbolFromSelf, value: Util.NumberFromChar }))
      )
      expect(String(schema)).toBe(`{ readonly a: number; readonly [x: symbol]: NumberFromChar }`)
    })

    it("nested extend nested Struct", async () => {
      const A = Schema.Struct({ a: Schema.Struct({ b: Schema.String }) })
      const B = Schema.Struct({ a: Schema.Struct({ c: Schema.Number }) })
      const schema = Schema.extend(A, B)
      expect(String(schema)).toBe(`{ readonly a: { readonly b: string; readonly c: number } }`)
    })

    it("nested with refinements extend nested struct with refinements", async () => {
      const A = Schema.Struct({
        nested: Schema.Struct({
          same: Schema.String.pipe(Schema.startsWith("start:")),
          different1: Schema.String
        })
      })
      const B = Schema.Struct({
        nested: Schema.Struct({
          same: Schema.String.pipe(Schema.endsWith(":end")),
          different2: Schema.String
        })
      })
      const schema = Schema.extend(A, B)
      expect(String(schema)).toBe(
        `{ readonly nested: { readonly same: a string ending with ":end"; readonly different1: string; readonly different2: string } }`
      )
      await Util.expectDecodeUnknownSuccess(
        schema,
        {
          nested: {
            same: "start:5:end",
            different1: "",
            different2: ""
          }
        }
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          nested: {
            same: "",
            different1: "",
            different2: ""
          }
        },
        `{ readonly nested: { readonly same: a string ending with ":end"; readonly different1: string; readonly different2: string } }
└─ ["nested"]
   └─ { readonly same: a string ending with ":end"; readonly different1: string; readonly different2: string }
      └─ ["same"]
         └─ a string ending with ":end"
            └─ From side refinement failure
               └─ a string starting with "start:"
                  └─ Predicate refinement failure
                     └─ Expected a string starting with "start:", actual ""`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {
          nested: {
            same: "start:5",
            different1: "",
            different2: ""
          }
        },
        `{ readonly nested: { readonly same: a string ending with ":end"; readonly different1: string; readonly different2: string } }
└─ ["nested"]
   └─ { readonly same: a string ending with ":end"; readonly different1: string; readonly different2: string }
      └─ ["same"]
         └─ a string ending with ":end"
            └─ Predicate refinement failure
               └─ Expected a string ending with ":end", actual "start:5"`
      )
    })
  })

  describe("TypeLiteralTransformation", () => {
    it("extend Struct", async () => {
      const schema = Schema.Struct({
        a: Schema.optionalWith(Schema.String, { exact: true, default: () => "" }),
        b: Schema.String
      }).pipe(Schema.extend(Schema.Struct({ c: Schema.Number })))
      expect(String(schema)).toBe(
        "({ readonly a?: string; readonly b: string; readonly c: number } <-> { readonly a: string; readonly b: string; readonly c: number })"
      )
    })

    it("extend Union", async () => {
      const schema = Schema.extend(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String, { default: () => "default" })
        }),
        Schema.Union(
          Schema.Struct({ b: Schema.String }),
          Schema.Struct({ c: Schema.String })
        )
      )
      expect(String(schema)).toBe(
        "({ readonly a?: string | undefined; readonly b: string } <-> { readonly a: string; readonly b: string }) | ({ readonly a?: string | undefined; readonly c: string } <-> { readonly a: string; readonly c: string })"
      )
    })

    it("extend refinement", async () => {
      const schema = Schema.extend(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String, { default: () => "default" })
        }),
        Schema.Struct({ b: Schema.String }).pipe(Schema.filter(() => true))
      )
      expect(String(schema)).toBe(
        "{ ({ readonly a?: string | undefined; readonly b: string } <-> { readonly a: string; readonly b: string }) | filter }"
      )
    })

    it("extend Suspend", async () => {
      const suspend = Schema.suspend(() => Schema.Struct({ b: Schema.String }))
      const schema = Schema.extend(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String, { default: () => "default" })
        }),
        suspend
      )
      expect(String((schema.ast as AST.Suspend).f())).toBe(
        "({ readonly a?: string | undefined; readonly b: string } <-> { readonly a: string; readonly b: string })"
      )
    })

    it("extend TypeLiteralTransformation", async () => {
      const schema = Schema.Struct({
        a: Schema.optionalWith(Schema.String, { exact: true, default: () => "" }),
        b: Schema.String
      }).pipe(
        Schema.extend(
          Schema.Struct({
            c: Schema.optionalWith(Schema.Number, { exact: true, default: () => 0 }),
            d: Schema.Boolean
          })
        )
      )
      expect(String(schema)).toBe(
        "({ readonly a?: string; readonly b: string; readonly c?: number; readonly d: boolean } <-> { readonly a: string; readonly b: string; readonly c: number; readonly d: boolean })"
      )
    })
  })

  describe("Union", () => {
    it("extend Struct", () => {
      const schema = Schema.Union(
        Schema.Struct({ a: Schema.Literal("a") }),
        Schema.Struct({ b: Schema.Literal("b") })
      ).pipe(Schema.extend(Schema.Struct({ c: Schema.Boolean })))
      expect(String(schema)).toBe(`{ readonly a: "a"; readonly c: boolean } | { readonly b: "b"; readonly c: boolean }`)
    })

    it("with defaults extend Union with defaults", async () => {
      const schema = Schema.Union(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String, { exact: true, default: () => "a" }),
          b: Schema.String
        }),
        Schema.Struct({
          c: Schema.optionalWith(Schema.String, { exact: true, default: () => "c" }),
          d: Schema.String
        })
      ).pipe(
        Schema.extend(
          Schema.Union(
            Schema.Struct({
              e: Schema.optionalWith(Schema.String, { exact: true, default: () => "e" }),
              f: Schema.String
            }),
            Schema.Struct({
              g: Schema.optionalWith(Schema.String, { exact: true, default: () => "g" }),
              h: Schema.String
            })
          )
        )
      )
      expect(String(schema)).toBe(
        "({ readonly a?: string; readonly b: string; readonly e?: string; readonly f: string } <-> { readonly a: string; readonly b: string; readonly e: string; readonly f: string }) | ({ readonly a?: string; readonly b: string; readonly g?: string; readonly h: string } <-> { readonly a: string; readonly b: string; readonly g: string; readonly h: string }) | ({ readonly c?: string; readonly d: string; readonly e?: string; readonly f: string } <-> { readonly c: string; readonly d: string; readonly e: string; readonly f: string }) | ({ readonly c?: string; readonly d: string; readonly g?: string; readonly h: string } <-> { readonly c: string; readonly d: string; readonly g: string; readonly h: string })"
      )
    })

    it("extend Union", () => {
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

    it("nested extends Struct", () => {
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
        `{ { readonly a: string; readonly c: boolean } | filter } | { { readonly b: number; readonly c: boolean } | filter }`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", c: false },
        `{ { readonly a: string; readonly c: boolean } | filter } | { { readonly b: number; readonly c: boolean } | filter }
├─ R filter
└─ { { readonly b: number; readonly c: boolean } | filter }
   └─ From side refinement failure
      └─ { readonly b: number; readonly c: boolean }
         └─ ["b"]
            └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: 1, c: false },
        `{ { readonly a: string; readonly c: boolean } | filter } | { { readonly b: number; readonly c: boolean } | filter }
├─ { { readonly a: string; readonly c: boolean } | filter }
│  └─ From side refinement failure
│     └─ { readonly a: string; readonly c: boolean }
│        └─ ["a"]
│           └─ is missing
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
        `{ { { readonly a: string; readonly c: boolean } | filter } | filter } | { { { readonly b: number; readonly c: boolean } | filter } | filter }`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "", c: true },
        `{ { { readonly a: string; readonly c: boolean } | filter } | filter } | { { { readonly b: number; readonly c: boolean } | filter } | filter }
├─ R1 filter
└─ { { { readonly b: number; readonly c: boolean } | filter } | filter }
   └─ From side refinement failure
      └─ { { readonly b: number; readonly c: boolean } | filter }
         └─ From side refinement failure
            └─ { readonly b: number; readonly c: boolean }
               └─ ["b"]
                  └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: -1, c: true },
        `{ { { readonly a: string; readonly c: boolean } | filter } | filter } | { { { readonly b: number; readonly c: boolean } | filter } | filter }
├─ { { { readonly a: string; readonly c: boolean } | filter } | filter }
│  └─ From side refinement failure
│     └─ { { readonly a: string; readonly c: boolean } | filter }
│        └─ From side refinement failure
│           └─ { readonly a: string; readonly c: boolean }
│              └─ ["a"]
│                 └─ is missing
└─ R2 filter`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", c: false },
        `{ { { readonly a: string; readonly c: boolean } | filter } | filter } | { { { readonly b: number; readonly c: boolean } | filter } | filter }
├─ R3 filter
└─ { { { readonly b: number; readonly c: boolean } | filter } | filter }
   └─ From side refinement failure
      └─ { { readonly b: number; readonly c: boolean } | filter }
         └─ From side refinement failure
            └─ { readonly b: number; readonly c: boolean }
               └─ ["b"]
                  └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: 1, c: false },
        `{ { { readonly a: string; readonly c: boolean } | filter } | filter } | { { { readonly b: number; readonly c: boolean } | filter } | filter }
├─ { { { readonly a: string; readonly c: boolean } | filter } | filter }
│  └─ From side refinement failure
│     └─ { { readonly a: string; readonly c: boolean } | filter }
│        └─ From side refinement failure
│           └─ { readonly a: string; readonly c: boolean }
│              └─ ["a"]
│                 └─ is missing
└─ R3 filter`
      )
    })
  })

  describe("Suspend", () => {
    it("List", async () => {
      type List = {
        readonly type: "nil"
      } | {
        readonly type: "cons"
        readonly tail: {
          readonly value: number
        } & List
      }
      const List = Schema.Union(
        Schema.Struct({ type: Schema.Literal("nil") }),
        Schema.Struct({
          type: Schema.Literal("cons"),
          tail: Schema.extend(
            Schema.Struct({ value: Schema.Number }),
            Schema.suspend((): Schema.Schema<List> => List)
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
      new Error(`Unsupported schema or overlapping types
details: cannot extend string with number`)
    )
    expect(() =>
      Schema.Record({ key: Schema.String, value: Schema.Number }).pipe(
        Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Boolean }))
      )
    ).toThrow(
      new Error(`Duplicate index signature
details: string index signature`)
    )
    expect(() =>
      Schema.Record({ key: Schema.SymbolFromSelf, value: Schema.Number }).pipe(
        Schema.extend(Schema.Record({ key: Schema.SymbolFromSelf, value: Schema.Boolean }))
      )
    ).toThrow(
      new Error(`Duplicate index signature
details: symbol index signature`)
    )
    expect(() =>
      Schema.Record({ key: Schema.String, value: Schema.Number }).pipe(
        Schema.extend(Schema.Record({ key: Schema.String.pipe(Schema.minLength(2)), value: Schema.Boolean }))
      )
    ).toThrow(
      new Error(`Duplicate index signature
details: string index signature`)
    )
    expect(() =>
      Schema.extend(
        Schema.Struct({ a: Schema.Struct({ b: Schema.String }) }),
        Schema.Struct({ a: Schema.Struct({ b: Schema.Number }) })
      )
    )
      .toThrow(
        new Error(
          `Unsupported schema or overlapping types
at path: ["a"]["b"]
details: cannot extend string with number`
        )
      )
  })
})
