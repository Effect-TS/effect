import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import * as Arbitrary from "effect/Arbitrary"
import * as FastCheck from "effect/FastCheck"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

const assertExtend = (A: Schema.Schema.Any, B: Schema.Schema.Any, expected: readonly [string, string], options?: {
  readonly skipFastCheck?: boolean | undefined
}) => {
  const AB = Schema.extend(A, B)
  const BA = Schema.extend(B, A)
  strictEqual(String(AB), expected[0], "AB")
  strictEqual(String(BA), expected[1], "BA")
  const arbAB = Arbitrary.make(AB)
  const arbBA = Arbitrary.make(BA)
  const isAB = Schema.is(AB)
  const isBA = Schema.is(BA)
  if (options?.skipFastCheck) {
    return
  }
  FastCheck.assert(
    FastCheck.property(arbAB, (ab) => isBA(ab)),
    { numRuns: 10 }
  )
  FastCheck.assert(
    FastCheck.property(arbBA, (ba) => isAB(ba)),
    { numRuns: 10 }
  )
}

describe("extend", () => {
  describe("String", () => {
    it("String & String", () => {
      const schema = Schema.extend(Schema.String, Schema.String)
      deepStrictEqual(schema.ast, Schema.String.ast)
    })

    it("String & Literal", () => {
      const literal = Schema.Literal("a")
      const schema = Schema.extend(Schema.String, literal)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("Literal & String", () => {
      const literal = Schema.Literal("a")
      const schema = Schema.extend(literal, Schema.String)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("(String with annotations) & String", () => {
      const A = Schema.String.annotations({ identifier: "A" })
      const schema = Schema.extend(A, Schema.String)
      assertTrue(schema.ast === A.ast)
    })

    it("String & Refinement", () => {
      const schema = Schema.extend(
        Schema.String,
        Schema.String.pipe(Schema.startsWith("start:"))
      )
      strictEqual(String(schema), `startsWith("start:")`)
      assertTrue(AST.isRefinement(schema.ast))
      assertTrue(schema.ast.from === AST.stringKeyword)
    })

    it("String Branded Refinement & String Branded Refinement", () => {
      const startsWith = Schema.String.pipe(Schema.startsWith("start:"), Schema.brand("start:"))
      const endsWith = Schema.String.pipe(Schema.endsWith(":end"), Schema.brand(":end"))
      const schema = Schema.extend(startsWith, endsWith)
      strictEqual(String(schema), `startsWith("start:") & Brand<"start:"> & endsWith(":end") & Brand<":end">`)
      deepStrictEqual(schema.ast.annotations[AST.BrandAnnotationId], [":end"])
      assertTrue(AST.isRefinement(schema.ast))
      const from = schema.ast.from
      deepStrictEqual(from.annotations[AST.BrandAnnotationId], ["start:"])
      assertTrue(AST.isRefinement(from))
      const fromfrom = from.from
      assertTrue(fromfrom === AST.stringKeyword)
    })
  })

  describe("Number", () => {
    it("Number & Number", () => {
      const schema = Schema.extend(Schema.Number, Schema.Number)
      deepStrictEqual(schema.ast, Schema.Number.ast)
    })

    it("Number & Literal", () => {
      const literal = Schema.Literal(1)
      const schema = Schema.extend(Schema.Number, literal)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("Literal & Number", () => {
      const literal = Schema.Literal(1)
      const schema = Schema.extend(literal, Schema.Number)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("(Number with annotations) & Number", () => {
      const A = Schema.Number.annotations({ identifier: "A" })
      const schema = Schema.extend(A, Schema.Number)
      assertTrue(schema.ast === A.ast)
    })

    it("Number & Refinement", () => {
      const schema = Schema.extend(
        Schema.Number,
        Schema.Number.pipe(Schema.greaterThan(0))
      )
      assertTrue(AST.isRefinement(schema.ast))
      assertTrue(schema.ast.from === AST.numberKeyword)
    })

    it("Number Branded Refinement & Number Branded Refinement", () => {
      const gt0 = Schema.Number.pipe(Schema.greaterThan(0), Schema.brand("> 0"))
      const lt2 = Schema.Number.pipe(Schema.lessThan(2), Schema.brand("< 2"))
      const schema = Schema.extend(gt0, lt2)
      strictEqual(String(schema.ast), `greaterThan(0) & Brand<"> 0"> & lessThan(2) & Brand<"< 2">`)
      deepStrictEqual(schema.ast.annotations[AST.BrandAnnotationId], ["< 2"])
      assertTrue(AST.isRefinement(schema.ast))
      const from = schema.ast.from
      deepStrictEqual(from.annotations[AST.BrandAnnotationId], ["> 0"])
      assertTrue(AST.isRefinement(from))
      const fromfrom = from.from
      assertTrue(fromfrom === AST.numberKeyword)
    })
  })

  describe("Boolean", () => {
    it("Boolean & Boolean", () => {
      const schema = Schema.extend(Schema.Boolean, Schema.Boolean)
      deepStrictEqual(schema.ast, Schema.Boolean.ast)
    })

    it("Boolean & Literal", () => {
      const literal = Schema.Literal(true)
      const schema = Schema.extend(Schema.Boolean, literal)
      deepStrictEqual(schema.ast, literal.ast)
    })

    it("Literal & Boolean", () => {
      const literal = Schema.Literal(true)
      const schema = Schema.extend(literal, Schema.Boolean)
      deepStrictEqual(schema.ast, literal.ast)
    })
  })

  describe("Struct", () => {
    it("Struct & Struct", async () => {
      const A = Schema.Struct({ a: Schema.String })
      const B = Schema.Struct({ b: Schema.Number })
      assertExtend(A, B, [
        "{ readonly a: string; readonly b: number }",
        "{ readonly b: number; readonly a: string }"
      ])
    })

    it("Struct $ TypeLiteralTransformation", async () => {
      const A = Schema.Struct({ a: Schema.Number })
      const B = Schema.Struct({
        b: Schema.String,
        c: Schema.optionalWith(Schema.String, { exact: true, default: () => "" })
      })
      assertExtend(A, B, [
        "({ readonly b: string; readonly c?: string; readonly a: number } <-> { readonly b: string; readonly c: string; readonly a: number })",
        "({ readonly b: string; readonly c?: string; readonly a: number } <-> { readonly b: string; readonly c: string; readonly a: number })"
      ])
    })

    it("Struct & Union", () => {
      const A = Schema.Struct({ b: Schema.Boolean })
      const B = Schema.Union(
        Schema.Struct({ a: Schema.Literal("a") }),
        Schema.Struct({ a: Schema.Literal("b") })
      )
      assertExtend(A, B, [
        `{ readonly b: boolean; readonly a: "a" } | { readonly b: boolean; readonly a: "b" }`,
        `{ readonly a: "a"; readonly b: boolean } | { readonly a: "b"; readonly b: boolean }`
      ])
    })

    it("Struct & Record(string, string)", async () => {
      const A = Schema.Struct({ a: Schema.String })
      const B = Schema.Record({ key: Schema.String, value: Schema.String })
      assertExtend(A, B, [
        `{ readonly a: string; readonly [x: string]: string }`,
        `{ readonly a: string; readonly [x: string]: string }`
      ])
    })

    it("Struct & Record(templateLiteral, string)", async () => {
      const A = Schema.Struct({ a: Schema.String })
      const B = Schema.Record(
        {
          key: Schema.TemplateLiteral(
            Schema.String,
            Schema.Literal("-"),
            Schema.Number
          ),
          value: Schema.String
        }
      )
      assertExtend(A, B, [
        "{ readonly a: string; readonly [x: `${string}-${number}`]: string }",
        "{ readonly a: string; readonly [x: `${string}-${number}`]: string }"
      ])
    })

    it("Struct & Record(string, NumberFromChar)", async () => {
      const A = Schema.Struct({ a: Schema.Number })
      const B = Schema.Record({ key: Schema.String, value: Util.NumberFromChar })
      assertExtend(A, B, [
        `{ readonly a: number; readonly [x: string]: NumberFromChar }`,
        `{ readonly a: number; readonly [x: string]: NumberFromChar }`
      ])
    })

    it("Struct & Record(symbol, NumberFromChar)", async () => {
      const A = Schema.Struct({ a: Schema.Number })
      const B = Schema.Record({ key: Schema.SymbolFromSelf, value: Util.NumberFromChar })
      assertExtend(A, B, [
        `{ readonly a: number; readonly [x: symbol]: NumberFromChar }`,
        `{ readonly a: number; readonly [x: symbol]: NumberFromChar }`
      ])
    })

    it("Nested Struct & Nested Struct", async () => {
      const A = Schema.Struct({ a: Schema.Struct({ b: Schema.String }) })
      const B = Schema.Struct({ a: Schema.Struct({ c: Schema.Number }) })
      assertExtend(A, B, [
        `{ readonly a: { readonly b: string; readonly c: number } }`,
        `{ readonly a: { readonly c: number; readonly b: string } }`
      ])
    })

    it("Nested Struct with refinements & Nested struct with refinements", async () => {
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
      assertExtend(A, B, [
        `{ readonly nested: { readonly same: startsWith("start:") & endsWith(":end"); readonly different1: string; readonly different2: string } }`,
        `{ readonly nested: { readonly same: endsWith(":end") & startsWith("start:"); readonly different2: string; readonly different1: string } }`
      ], { skipFastCheck: true })
      const schema = Schema.extend(A, B)
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
    it("TypeLiteralTransformation & Struct", async () => {
      const A = Schema.Struct({
        a: Schema.optionalWith(Schema.String, { exact: true, default: () => "" }),
        b: Schema.String
      })
      const B = Schema.Struct({ c: Schema.Number })
      assertExtend(A, B, [
        "({ readonly a?: string; readonly b: string; readonly c: number } <-> { readonly a: string; readonly b: string; readonly c: number })",
        "({ readonly a?: string; readonly b: string; readonly c: number } <-> { readonly a: string; readonly b: string; readonly c: number })"
      ])
    })

    it("TypeLiteralTransformation & Union", async () => {
      const A = Schema.Struct({
        a: Schema.optionalWith(Schema.String, { default: () => "default" })
      })
      const B = Schema.Union(
        Schema.Struct({ b: Schema.String }),
        Schema.Struct({ c: Schema.String })
      )
      assertExtend(A, B, [
        "({ readonly a?: string | undefined; readonly b: string } <-> { readonly a: string; readonly b: string }) | ({ readonly a?: string | undefined; readonly c: string } <-> { readonly a: string; readonly c: string })",
        "({ readonly a?: string | undefined; readonly b: string } <-> { readonly a: string; readonly b: string }) | ({ readonly a?: string | undefined; readonly c: string } <-> { readonly a: string; readonly c: string })"
      ])
    })

    it("TypeLiteralTransformation & Refinement", async () => {
      const A = Schema.Struct({
        a: Schema.optionalWith(Schema.String, { default: () => "default" })
      })
      const B = Schema.Struct({ b: Schema.String }).pipe(Schema.filter(() => true))
      assertExtend(A, B, [
        "{ ({ readonly a?: string | undefined; readonly b: string } <-> { readonly a: string; readonly b: string }) | filter }",
        "{ ({ readonly a?: string | undefined; readonly b: string } <-> { readonly a: string; readonly b: string }) | filter }"
      ])
    })

    it("TypeLiteralTransformation & Suspend", async () => {
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

    it("TypeLiteralTransformation & TypeLiteralTransformation", async () => {
      const A = Schema.Struct({
        a: Schema.optionalWith(Schema.String, { exact: true, default: () => "" }),
        b: Schema.String
      })
      const B = Schema.Struct({
        c: Schema.optionalWith(Schema.Number, { exact: true, default: () => 0 }),
        d: Schema.Boolean
      })
      assertExtend(A, B, [
        "({ readonly a?: string; readonly b: string; readonly c?: number; readonly d: boolean } <-> { readonly a: string; readonly b: string; readonly c: number; readonly d: boolean })",
        "({ readonly c?: number; readonly d: boolean; readonly a?: string; readonly b: string } <-> { readonly c: number; readonly d: boolean; readonly a: string; readonly b: string })"
      ])
    })
  })

  describe("FinalTransformation", () => {
    it("FinalTransformation & Struct", async () => {
      const A = Schema.Struct({
        a: Schema.String
      })

      const B = Schema.Struct({
        b: Schema.String
      })

      const C = Schema.Struct({
        c: Schema.String
      })

      const AB = Schema.transform(A, B, {
        strict: true,
        decode: (a) => ({ b: a.a }),
        encode: (b) => ({ a: b.b })
      })

      assertExtend(AB, C, [
        "({ readonly a: string; readonly c: string } <-> { readonly b: string; readonly c: string })",
        "({ readonly a: string; readonly c: string } <-> { readonly b: string; readonly c: string })"
      ])
    })
  })

  describe("ComposeTransformation", () => {
    it("ComposeTransformation & Struct", async () => {
      const A = Schema.Struct({
        a: Schema.NumberFromString
      })

      const B = Schema.Struct({
        a: Schema.Number
      })

      const AB = Schema.compose(A, B)

      const C = Schema.Struct({
        c: Schema.String
      })

      assertExtend(AB, C, [
        "({ readonly a: NumberFromString; readonly c: string } <-> { readonly a: number; readonly c: string })",
        "({ readonly a: NumberFromString; readonly c: string } <-> { readonly a: number; readonly c: string })"
      ])

      const schema = Schema.extend(AB, C)
      await Util.assertions.decoding.succeed(
        schema,
        { a: "1", c: "c" },
        { a: 1, c: "c" }
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a", c: "c" },
        `({ readonly a: NumberFromString; readonly c: string } <-> { readonly a: number; readonly c: string })
└─ Encoded side transformation failure
   └─ { readonly a: NumberFromString; readonly c: string }
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
      )
    })
  })

  describe("Union", () => {
    it("Union & Struct", () => {
      const A = Schema.Union(
        Schema.Struct({ a: Schema.Literal("a") }),
        Schema.Struct({ b: Schema.Literal("b") })
      )
      const B = Schema.Struct({ c: Schema.Boolean })
      assertExtend(A, B, [
        `{ readonly a: "a"; readonly c: boolean } | { readonly b: "b"; readonly c: boolean }`,
        `{ readonly c: boolean; readonly a: "a" } | { readonly c: boolean; readonly b: "b" }`
      ])
    })

    it("Union of structs with defaults & Union of structs with defaults", async () => {
      const A = Schema.Union(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String, { exact: true, default: () => "a" }),
          b: Schema.String
        }),
        Schema.Struct({
          c: Schema.optionalWith(Schema.String, { exact: true, default: () => "c" }),
          d: Schema.String
        })
      )
      const B = Schema.Union(
        Schema.Struct({
          e: Schema.optionalWith(Schema.String, { exact: true, default: () => "e" }),
          f: Schema.String
        }),
        Schema.Struct({
          g: Schema.optionalWith(Schema.String, { exact: true, default: () => "g" }),
          h: Schema.String
        })
      )
      assertExtend(A, B, [
        "({ readonly a?: string; readonly b: string; readonly e?: string; readonly f: string } <-> { readonly a: string; readonly b: string; readonly e: string; readonly f: string }) | ({ readonly a?: string; readonly b: string; readonly g?: string; readonly h: string } <-> { readonly a: string; readonly b: string; readonly g: string; readonly h: string }) | ({ readonly c?: string; readonly d: string; readonly e?: string; readonly f: string } <-> { readonly c: string; readonly d: string; readonly e: string; readonly f: string }) | ({ readonly c?: string; readonly d: string; readonly g?: string; readonly h: string } <-> { readonly c: string; readonly d: string; readonly g: string; readonly h: string })",
        "({ readonly e?: string; readonly f: string; readonly a?: string; readonly b: string } <-> { readonly e: string; readonly f: string; readonly a: string; readonly b: string }) | ({ readonly e?: string; readonly f: string; readonly c?: string; readonly d: string } <-> { readonly e: string; readonly f: string; readonly c: string; readonly d: string }) | ({ readonly g?: string; readonly h: string; readonly a?: string; readonly b: string } <-> { readonly g: string; readonly h: string; readonly a: string; readonly b: string }) | ({ readonly g?: string; readonly h: string; readonly c?: string; readonly d: string } <-> { readonly g: string; readonly h: string; readonly c: string; readonly d: string })"
      ])
    })

    it("Union & Union", () => {
      const A = Schema.Union(
        Schema.Struct({ a: Schema.Literal("a") }),
        Schema.Struct({ a: Schema.Literal("b") })
      )
      const B = Schema.Union(
        Schema.Struct({ c: Schema.Boolean }),
        Schema.Struct({ d: Schema.Number })
      )
      assertExtend(A, B, [
        `{ readonly a: "a"; readonly c: boolean } | { readonly a: "a"; readonly d: number } | { readonly a: "b"; readonly c: boolean } | { readonly a: "b"; readonly d: number }`,
        `{ readonly c: boolean; readonly a: "a" } | { readonly c: boolean; readonly a: "b" } | { readonly d: number; readonly a: "a" } | { readonly d: number; readonly a: "b" }`
      ])
    })

    it("Nested Union & Struct", () => {
      const A = Schema.Union(
        Schema.Union(
          Schema.Struct({ a: Schema.Literal("a") }),
          Schema.Struct({ a: Schema.Literal("b") })
        ),
        Schema.Struct({ b: Schema.Literal("b") })
      )
      const B = Schema.Struct({ c: Schema.Boolean })
      assertExtend(A, B, [
        `{ readonly a: "a"; readonly c: boolean } | { readonly a: "b"; readonly c: boolean } | { readonly b: "b"; readonly c: boolean }`,
        `{ readonly c: boolean; readonly a: "a" } | { readonly c: boolean; readonly a: "b" } | { readonly c: boolean; readonly b: "b" }`
      ])
    })
  })

  describe("Refinements", () => {
    it("Struct & Refinement", async () => {
      const A = Schema.Struct({ a: Schema.String })
      const B = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b > 0, { message: () => "R filter" })
      )
      assertExtend(A, B, [
        `{ { readonly a: string; readonly b: number } | filter }`,
        `{ { readonly b: number; readonly a: string } | filter }`
      ])
      const schema = Schema.extend(A, B)
      await Util.assertions.decoding.fail(
        schema,
        { a: "a", b: -1 },
        `R filter`
      )
    })

    it("Struct & Refinement (two filters)", async () => {
      const A = Schema.Struct({ a: Schema.String })
      const B = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b > 0, { message: () => "filter1" }),
        Schema.filter((input) => input.b < 10, { message: () => "filter2" })
      )
      assertExtend(A, B, [
        `{ { { readonly a: string; readonly b: number } | filter } | filter }`,
        `{ { { readonly b: number; readonly a: string } | filter } | filter }`
      ])
      const schema = Schema.extend(A, B)
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

    it("Refinement & Refinement", async () => {
      const A = Schema.Struct({ a: Schema.String }).pipe(
        Schema.filter((input) => input.a.length > 0, { message: () => "R1 filter" })
      )
      const B = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b > 0, { message: () => "R2 filter" })
      )
      assertExtend(A, B, [
        `{ { { readonly a: string; readonly b: number } | filter } | filter }`,
        `{ { { readonly b: number; readonly a: string } | filter } | filter }`
      ])
      const schema = Schema.extend(A, B)
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

    it("Union of structs & Refinement", async () => {
      const S1 = Schema.Struct({ a: Schema.String })
      const S2 = Schema.Struct({ b: Schema.Number })
      const B = Schema.Struct({ c: Schema.Boolean }).pipe(
        Schema.filter((input) => input.c === true, { message: () => "R filter" })
      )
      const A = Schema.Union(S1, S2)
      assertExtend(A, B, [
        `{ { readonly a: string; readonly c: boolean } | filter } | { { readonly b: number; readonly c: boolean } | filter }`,
        `{ { readonly c: boolean; readonly a: string } | filter } | { { readonly c: boolean; readonly b: number } | filter }`
      ])

      const schema = Schema.extend(A, B)
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

    it("Union of refinements & Refinement", async () => {
      const R1 = Schema.Struct({ a: Schema.String }).pipe(
        Schema.filter((input) => input.a.length > 0, { message: () => "R1 filter" })
      )
      const R2 = Schema.Struct({ b: Schema.Number }).pipe(
        Schema.filter((input) => input.b > 0, { message: () => "R2 filter" })
      )
      const B = Schema.Struct({ c: Schema.Boolean }).pipe(
        Schema.filter((input) => input.c === true, { message: () => "R3 filter" })
      )
      const A = Schema.Union(R1, R2)
      assertExtend(A, B, [
        `{ { { readonly a: string; readonly c: boolean } | filter } | filter } | { { { readonly b: number; readonly c: boolean } | filter } | filter }`,
        `{ { { readonly c: boolean; readonly a: string } | filter } | filter } | { { { readonly c: boolean; readonly b: number } | filter } | filter }`
      ])
      const schema = Schema.extend(A, B)
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
    it("List as union", async () => {
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

  it("Errors", () => {
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
