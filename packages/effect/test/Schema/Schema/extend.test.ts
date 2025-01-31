import { describe, it } from "@effect/vitest"
import * as Arbitrary from "effect/Arbitrary"
import * as FastCheck from "effect/FastCheck"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { assertTrue, deepStrictEqual, strictEqual, throws } from "effect/test/util"

describe("extend", () => {
  describe("String", () => {
    it("String and String", () => {
      const schema = Schema.extend(Schema.String, Schema.String)
      deepStrictEqual(schema.ast, Schema.String.ast)
    })

    it("String and Literal", () => {
      const literal = Schema.Literal("a")
      const schema = Schema.extend(Schema.String, literal)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("Literal and String", () => {
      const literal = Schema.Literal("a")
      const schema = Schema.extend(literal, Schema.String)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("(String and annotations) and String", () => {
      const A = Schema.String.annotations({ identifier: "A" })
      const schema = Schema.extend(A, Schema.String)
      assertTrue(schema.ast === A.ast)
    })

    it("String and Refinement", () => {
      const schema = Schema.extend(
        Schema.String,
        Schema.String.pipe(Schema.startsWith("start:"))
      )
      strictEqual(schema.ast._tag, "Refinement")
      assertTrue((schema.ast as AST.Refinement).from === AST.stringKeyword)
    })

    it("should support two refined brands", () => {
      const startsWith = Schema.String.pipe(Schema.startsWith("start:"), Schema.brand("start:"))
      const endsWith = Schema.String.pipe(Schema.endsWith(":end"), Schema.brand(":end"))
      const schema = Schema.extend(startsWith, endsWith)
      strictEqual(String(schema.ast), `startsWith("start:") & Brand<"start:"> & endsWith(":end") & Brand<":end">`)
      deepStrictEqual(schema.ast.annotations[AST.BrandAnnotationId], [":end"])
      const from = (schema.ast as AST.Refinement).from
      deepStrictEqual(from.annotations[AST.BrandAnnotationId], ["start:"])
      const fromfrom = (from as AST.Refinement).from
      assertTrue(fromfrom === AST.stringKeyword)
    })
  })

  describe("Number", () => {
    it("Number and Number", () => {
      const schema = Schema.extend(Schema.Number, Schema.Number)
      deepStrictEqual(schema.ast, Schema.Number.ast)
    })

    it("Number and Literal", () => {
      const literal = Schema.Literal(1)
      const schema = Schema.extend(Schema.Number, literal)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("Literal and Number", () => {
      const literal = Schema.Literal(1)
      const schema = Schema.extend(literal, Schema.Number)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("(Number and annotations) and Number", () => {
      const A = Schema.Number.annotations({ identifier: "A" })
      const schema = Schema.extend(A, Schema.Number)
      assertTrue(schema.ast === A.ast)
    })

    it("Number and Refinement", () => {
      const schema = Schema.extend(
        Schema.Number,
        Schema.Number.pipe(Schema.greaterThan(0))
      )
      strictEqual(schema.ast._tag, "Refinement")
      assertTrue((schema.ast as AST.Refinement).from === AST.numberKeyword)
    })

    it("should support two refined brands", () => {
      const gt0 = Schema.Number.pipe(Schema.greaterThan(0), Schema.brand("> 0"))
      const lt2 = Schema.Number.pipe(Schema.lessThan(2), Schema.brand("< 2"))
      const schema = Schema.extend(gt0, lt2)
      strictEqual(String(schema.ast), `greaterThan(0) & Brand<"> 0"> & lessThan(2) & Brand<"< 2">`)
      deepStrictEqual(schema.ast.annotations[AST.BrandAnnotationId], ["< 2"])
      const from = (schema.ast as AST.Refinement).from
      deepStrictEqual(from.annotations[AST.BrandAnnotationId], ["> 0"])
      const fromfrom = (from as AST.Refinement).from
      assertTrue(fromfrom === AST.numberKeyword)
    })
  })

  describe("Boolean", () => {
    it("Boolean and Boolean", () => {
      const schema = Schema.extend(Schema.Boolean, Schema.Boolean)
      deepStrictEqual(schema.ast, Schema.Boolean.ast)
    })

    it("Boolean and Literal", () => {
      const literal = Schema.Literal(true)
      const schema = Schema.extend(Schema.Boolean, literal)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("Literal and Boolean", () => {
      const literal = Schema.Literal(true)
      const schema = Schema.extend(literal, Schema.Boolean)
      deepStrictEqual(schema.ast, literal.ast)
    })
  })

  describe("Struct", () => {
    it("extend struct", async () => {
      const schema = Schema.extend(Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.Number }))
      strictEqual(String(schema), "{ readonly a: string; readonly b: number }")
    })

    it("extend TypeLiteralTransformation", async () => {
      const schema = Schema.Struct({ a: Schema.Number }).pipe(
        Schema.extend(
          Schema.Struct({ b: Schema.String, c: Schema.optionalWith(Schema.String, { exact: true, default: () => "" }) })
        )
      )
      strictEqual(
        String(schema),
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
      strictEqual(String(schema), `{ readonly b: boolean; readonly a: "a" } | { readonly b: boolean; readonly a: "b" }`)
    })

    it("extend Record(string, string)", async () => {
      const schema = Schema.Struct({ a: Schema.String }).pipe(
        Schema.extend(Schema.Record({ key: Schema.String, value: Schema.String }))
      )
      strictEqual(String(schema), `{ readonly a: string; readonly [x: string]: string }`)
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
      strictEqual(String(schema), "{ readonly a: string; readonly [x: `${string}-${number}`]: string }")
    })

    it("extend Record(string, NumberFromChar)", async () => {
      const schema = Schema.Struct({ a: Schema.Number }).pipe(
        Schema.extend(Schema.Record({ key: Schema.String, value: Util.NumberFromChar }))
      )
      strictEqual(String(schema), `{ readonly a: number; readonly [x: string]: NumberFromChar }`)
    })

    it("extend Record(symbol, NumberFromChar)", async () => {
      const schema = Schema.Struct({ a: Schema.Number }).pipe(
        Schema.extend(Schema.Record({ key: Schema.SymbolFromSelf, value: Util.NumberFromChar }))
      )
      strictEqual(String(schema), `{ readonly a: number; readonly [x: symbol]: NumberFromChar }`)
    })

    it("nested extend nested Struct", async () => {
      const A = Schema.Struct({ a: Schema.Struct({ b: Schema.String }) })
      const B = Schema.Struct({ a: Schema.Struct({ c: Schema.Number }) })
      const schema = Schema.extend(A, B)
      strictEqual(String(schema), `{ readonly a: { readonly b: string; readonly c: number } }`)
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
      strictEqual(
        String(schema),
        `{ readonly nested: { readonly same: startsWith("start:") & endsWith(":end"); readonly different1: string; readonly different2: string } }`
      )
      await Util.assertions.decoding.succeed(
        schema,
        {
          nested: {
            same: "start:5:end",
            different1: "",
            different2: ""
          }
        }
      )
      await Util.assertions.decoding.fail(
        schema,
        {
          nested: {
            same: "",
            different1: "",
            different2: ""
          }
        },
        `{ readonly nested: { readonly same: startsWith("start:") & endsWith(":end"); readonly different1: string; readonly different2: string } }
└─ ["nested"]
   └─ { readonly same: startsWith("start:") & endsWith(":end"); readonly different1: string; readonly different2: string }
      └─ ["same"]
         └─ startsWith("start:") & endsWith(":end")
            └─ From side refinement failure
               └─ startsWith("start:")
                  └─ Predicate refinement failure
                     └─ Expected a string starting with "start:", actual ""`
      )
      await Util.assertions.decoding.fail(
        schema,
        {
          nested: {
            same: "start:5",
            different1: "",
            different2: ""
          }
        },
        `{ readonly nested: { readonly same: startsWith("start:") & endsWith(":end"); readonly different1: string; readonly different2: string } }
└─ ["nested"]
   └─ { readonly same: startsWith("start:") & endsWith(":end"); readonly different1: string; readonly different2: string }
      └─ ["same"]
         └─ startsWith("start:") & endsWith(":end")
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
      strictEqual(
        String(schema),
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
      strictEqual(
        String(schema),
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
      strictEqual(
        String(schema),
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
      strictEqual(
        String((schema.ast as AST.Suspend).f()),
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
      strictEqual(
        String(schema),
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
      strictEqual(String(schema), `{ readonly a: "a"; readonly c: boolean } | { readonly b: "b"; readonly c: boolean }`)
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
      strictEqual(
        String(schema),
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
      strictEqual(
        String(schema),
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
      strictEqual(
        String(schema),
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
      strictEqual(String(schema), `{ { readonly a: string; readonly b: number } | filter }`)
      await Util.assertions.decoding.fail(
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
      strictEqual(String(schema), `{ { { readonly a: string; readonly b: number } | filter } | filter }`)
      await Util.assertions.decoding.fail(
        schema,
        { a: "a", b: -1 },
        `filter1`
      )
      await Util.assertions.decoding.fail(
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
      strictEqual(String(schema), `{ { { readonly a: string; readonly b: number } | filter } | filter }`)
      await Util.assertions.decoding.fail(
        schema,
        { a: "", b: 1 },
        `R1 filter`
      )
      await Util.assertions.decoding.fail(
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
      strictEqual(
        String(schema),
        `{ { readonly a: string; readonly c: boolean } | filter } | { { readonly b: number; readonly c: boolean } | filter }`
      )
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
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
      strictEqual(
        String(schema),
        `{ { { readonly a: string; readonly c: boolean } | filter } | filter } | { { { readonly b: number; readonly c: boolean } | filter } | filter }`
      )
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
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
      strictEqual(
        String(List),
        `{ readonly type: "nil" } | { readonly type: "cons"; readonly tail: <suspended schema> }`
      )
      await Util.assertions.decoding.succeed(List, { type: "nil" })
      await Util.assertions.decoding.succeed(List, { type: "cons", tail: { value: 1, type: "nil" } })
      await Util.assertions.decoding.succeed(List, {
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
    throws(
      () => Schema.String.pipe(Schema.extend(Schema.Number)),
      new Error(`Unsupported schema or overlapping types
details: cannot extend string with number`)
    )
    throws(
      () =>
        Schema.Record({ key: Schema.String, value: Schema.Number }).pipe(
          Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Boolean }))
        ),
      new Error(`Duplicate index signature
details: string index signature`)
    )
    throws(
      () =>
        Schema.Record({ key: Schema.SymbolFromSelf, value: Schema.Number }).pipe(
          Schema.extend(Schema.Record({ key: Schema.SymbolFromSelf, value: Schema.Boolean }))
        ),
      new Error(`Duplicate index signature
details: symbol index signature`)
    )
    throws(
      () =>
        Schema.Record({ key: Schema.String, value: Schema.Number }).pipe(
          Schema.extend(Schema.Record({ key: Schema.String.pipe(Schema.minLength(2)), value: Schema.Boolean }))
        ),
      new Error(`Duplicate index signature
details: string index signature`)
    )
    throws(
      () =>
        Schema.extend(
          Schema.Struct({ a: Schema.Struct({ b: Schema.String }) }),
          Schema.Struct({ a: Schema.Struct({ b: Schema.Number }) })
        ),
      new Error(
        `Unsupported schema or overlapping types
at path: ["a"]["b"]
details: cannot extend string with number`
      )
    )
  })
})
