import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("filter", () => {
  it("annotation options", () => {
    const schema = S.String.pipe(
      S.filter((s): s is string => s.length === 1, {
        schemaId: Symbol.for("Char"),
        description: "description",
        documentation: "documentation",
        examples: ["examples"],
        identifier: "identifier",
        jsonSchema: { minLength: 1, maxLength: 1 },
        title: "title"
      })
    )
    expect(schema.ast.annotations).toEqual({
      [AST.SchemaIdAnnotationId]: Symbol.for("Char"),
      [AST.DescriptionAnnotationId]: "description",
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.ExamplesAnnotationId]: [
        "examples"
      ],
      [AST.IdentifierAnnotationId]: "identifier",
      [AST.JSONSchemaAnnotationId]: {
        "maxLength": 1,
        "minLength": 1
      },
      [AST.TitleAnnotationId]: "title"
    })
  })

  it("the constructor should validate the input by default", () => {
    const schema = S.NonEmptyString
    Util.expectConstructorSuccess(schema, "a")
    Util.expectConstructorFailure(
      schema,
      "",
      `NonEmptyString
└─ Predicate refinement failure
   └─ Expected NonEmptyString, actual ""`
    )
  })

  it("the constructor validation can be disabled", () => {
    const schema = S.NonEmptyString
    expect(schema.make("", true)).toStrictEqual("")
    expect(schema.make("", { disableValidation: true })).toStrictEqual("")
  })

  describe("ParseIssue overloading", () => {
    it("return a Type", async () => {
      const schema = S.Struct({ a: S.String, b: S.String }).pipe(
        S.filter((o) => {
          if (o.b !== o.a) {
            return new ParseResult.Type(S.Literal(o.a).ast, o.b, `b should be equal to a's value ("${o.a}")`)
          }
        })
      )

      await Util.expectDecodeUnknownSuccess(schema, { a: "x", b: "x" })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: "b" },
        `{ { readonly a: string; readonly b: string } | filter }
└─ Predicate refinement failure
   └─ b should be equal to a's value ("a")`
      )
    })

    const ValidString = S.Trim.pipe(S.minLength(1, { message: () => "ERROR_MIN_LENGTH" }))
    const Test = S.Struct({
      a: S.Struct({
        b: S.String,
        c: ValidString
      }),
      d: S.Tuple(S.String, ValidString)
    }).annotations({ identifier: "Test" })

    it("return a Pointer", async () => {
      const schema = Test.pipe(S.filter((input) => {
        if (input.a.b !== input.a.c) {
          return new ParseResult.Pointer(
            ["a", "c"],
            input,
            new ParseResult.Type(S.Literal(input.a.b).ast, input.a.c)
          )
        }
        if (input.d[0] !== input.d[1]) {
          return new ParseResult.Pointer(
            ["d", 1],
            input,
            new ParseResult.Type(S.Literal(input.d[0]).ast, input.d[1])
          )
        }
      }))
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `{ Test | filter }
└─ From side refinement failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: a string at least 1 character(s) long }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["a"]["c"]
      └─ Expected "b", actual "c"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "-", c: "-" }, d: ["item0", "item1"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["d"][1]
      └─ Expected "item0", actual "item1"`
      )
    })

    it("return a path and a message", async () => {
      const schema = Test.pipe(S.filter((input) => {
        if (input.a.b !== input.a.c) {
          return {
            path: ["a", "c"],
            message: "FILTER1"
          }
        }
        if (input.d[0] !== input.d[1]) {
          return {
            path: ["d", 1],
            message: "FILTER2"
          }
        }
      }))
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `{ Test | filter }
└─ From side refinement failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: a string at least 1 character(s) long }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["a"]["c"]
      └─ FILTER1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "-", c: "-" }, d: ["item0", "item1"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["d"][1]
      └─ FILTER2`
      )
    })

    it("return many paths and messages", async () => {
      const schema = Test.pipe(S.filter((input) => {
        const issues: Array<S.FilterIssue> = []
        if (input.a.b !== input.a.c) {
          issues.push({
            path: ["a", "c"],
            message: "FILTER1"
          })
        }
        if (input.d[0] !== input.d[1]) {
          issues.push({
            path: ["d", 1],
            message: "FILTER2"
          })
        }
        return issues
      }))
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `{ Test | filter }
└─ From side refinement failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: a string at least 1 character(s) long }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["a"]["c"]
      └─ FILTER1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "-", c: "-" }, d: ["item0", "item1"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["d"][1]
      └─ FILTER2`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: { b: "b", c: "c" }, d: ["item0", "item1"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ { Test | filter }
      ├─ ["a"]["c"]
      │  └─ FILTER1
      └─ ["d"][1]
         └─ FILTER2`
      )
    })
  })

  describe("Stable Filters (such as `minItems`, `maxItems`, and `itemsCount`)", () => {
    it("when the 'errors' option is set to 'all', stable filters should generate multiple errors", async () => {
      const schema = S.Struct({
        tags: S.Array(S.String.pipe(S.minLength(2))).pipe(S.minItems(3))
      })
      await Util.expectDecodeUnknownFailure(
        schema,
        { tags: ["AB", "B"] },
        `{ readonly tags: an array of at least 3 items }
└─ ["tags"]
   └─ an array of at least 3 items
      ├─ an array of at least 3 items
      │  └─ From side refinement failure
      │     └─ ReadonlyArray<a string at least 2 character(s) long>
      │        └─ [1]
      │           └─ a string at least 2 character(s) long
      │              └─ Predicate refinement failure
      │                 └─ Expected a string at least 2 character(s) long, actual "B"
      └─ an array of at least 3 items
         └─ Predicate refinement failure
            └─ Expected an array of at least 3 items, actual ["AB","B"]`,
        Util.allErrors
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { tags: ["AB", "B"] },
        `{ readonly tags: an array of at least 3 items }
└─ ["tags"]
   └─ an array of at least 3 items
      └─ From side refinement failure
         └─ ReadonlyArray<a string at least 2 character(s) long>
            └─ [1]
               └─ a string at least 2 character(s) long
                  └─ Predicate refinement failure
                     └─ Expected a string at least 2 character(s) long, actual "B"`
      )
    })

    it("when the 'errors' option is set to 'all', stable filters should not be applied when the from side fails with a Type issue", async () => {
      await Util.expectDecodeUnknownFailure(
        S.Struct({
          tags: S.Array(S.String).pipe(S.minItems(1))
        }),
        {},
        `{ readonly tags: an array of at least 1 items }
└─ ["tags"]
   └─ is missing`,
        Util.allErrors
      )
      await Util.expectDecodeUnknownFailure(
        S.Struct({
          tags: S.Array(S.String).pipe(S.minItems(1), S.maxItems(3))
        }),
        {},
        `{ readonly tags: an array of at most 3 items }
└─ ["tags"]
   └─ is missing`,
        Util.allErrors
      )
    })
  })
})
