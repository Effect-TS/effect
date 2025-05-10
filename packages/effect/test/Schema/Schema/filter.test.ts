import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

describe("filter", () => {
  describe("error messages", () => {
    it("single refinement", async () => {
      const schema = S.Number.pipe(S.int())
      await Util.assertions.decoding.fail(
        schema,
        null,
        `int
└─ From side refinement failure
   └─ Expected number, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        1.1,
        `int
└─ Predicate refinement failure
   └─ Expected an integer, actual 1.1`
      )
    })

    it("double refinement", async () => {
      const schema = S.Number.pipe(S.int(), S.positive())
      await Util.assertions.decoding.fail(
        schema,
        null,
        `int & positive
└─ From side refinement failure
   └─ int
      └─ From side refinement failure
         └─ Expected number, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        1.1,
        `int & positive
└─ From side refinement failure
   └─ int
      └─ Predicate refinement failure
         └─ Expected an integer, actual 1.1`
      )
      await Util.assertions.decoding.fail(
        schema,
        -1,
        `int & positive
└─ Predicate refinement failure
   └─ Expected a positive number, actual -1`
      )
    })

    it("with an anonymous refinement", async () => {
      const schema = S.Number.pipe(S.filter(() => false), S.positive())
      await Util.assertions.decoding.fail(
        schema,
        1,
        `{ number | filter } & positive
└─ From side refinement failure
   └─ { number | filter }
      └─ Predicate refinement failure
         └─ Expected { number | filter }, actual 1`
      )
    })
  })

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
    deepStrictEqual(schema.ast.annotations, {
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
    Util.assertions.make.succeed(schema, "a")
    Util.assertions.make.fail(
      schema,
      "",
      `NonEmptyString
└─ Predicate refinement failure
   └─ Expected a non empty string, actual ""`
    )
  })

  it("the constructor validation can be disabled", () => {
    const schema = S.NonEmptyString
    strictEqual(schema.make("", true), "")
    strictEqual(schema.make("", { disableValidation: true }), "")
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

      await Util.assertions.decoding.succeed(schema, { a: "x", b: "x" })
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `{ Test | filter }
└─ From side refinement failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: minLength(1) }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["a"]["c"]
      └─ Expected "b", actual "c"`
      )
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `{ Test | filter }
└─ From side refinement failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: minLength(1) }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["a"]["c"]
      └─ FILTER1`
      )
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `{ Test | filter }
└─ From side refinement failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: minLength(1) }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["a"]["c"]
      └─ FILTER1`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "-", c: "-" }, d: ["item0", "item1"] },
        `{ Test | filter }
└─ Predicate refinement failure
   └─ ["d"][1]
      └─ FILTER2`
      )
      await Util.assertions.decoding.fail(
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

  describe("Stable Filters", () => {
    describe("Array", () => {
      it("when the 'errors' option is set to 'all', stable filters should generate multiple errors", async () => {
        const schema = S.Struct({
          tags: S.Array(S.String.pipe(S.minLength(2))).pipe(S.minItems(3))
        })
        await Util.assertions.decoding.fail(
          schema,
          { tags: ["AB", "B"] },
          `{ readonly tags: minItems(3) }
└─ ["tags"]
   └─ minItems(3)
      ├─ minItems(3)
      │  └─ From side refinement failure
      │     └─ ReadonlyArray<minLength(2)>
      │        └─ [1]
      │           └─ minLength(2)
      │              └─ Predicate refinement failure
      │                 └─ Expected a string at least 2 character(s) long, actual "B"
      └─ minItems(3)
         └─ Predicate refinement failure
            └─ Expected an array of at least 3 item(s), actual ["AB","B"]`,
          { parseOptions: Util.ErrorsAll }
        )
        await Util.assertions.decoding.fail(
          schema,
          { tags: ["AB", "B"] },
          `{ readonly tags: minItems(3) }
└─ ["tags"]
   └─ minItems(3)
      └─ From side refinement failure
         └─ ReadonlyArray<minLength(2)>
            └─ [1]
               └─ minLength(2)
                  └─ Predicate refinement failure
                     └─ Expected a string at least 2 character(s) long, actual "B"`
        )
      })

      it("when the 'errors' option is set to 'all', stable filters should be applied only if the from part fails with a `Composite` issue", async () => {
        await Util.assertions.decoding.fail(
          S.Struct({
            tags: S.Array(S.String).pipe(S.minItems(1))
          }),
          {},
          `{ readonly tags: minItems(1) }
└─ ["tags"]
   └─ is missing`,
          { parseOptions: Util.ErrorsAll }
        )
        await Util.assertions.decoding.fail(
          S.Struct({
            tags: S.Array(S.String).pipe(S.minItems(1), S.maxItems(3))
          }),
          {},
          `{ readonly tags: minItems(1) & maxItems(3) }
└─ ["tags"]
   └─ is missing`,
          { parseOptions: Util.ErrorsAll }
        )
      })
    })

    describe("NonEmptyArray", () => {
      it("when the 'errors' option is set to 'all', stable filters should generate multiple errors", async () => {
        const schema = S.Struct({
          tags: S.NonEmptyArray(S.String.pipe(S.minLength(2))).pipe(S.minItems(3))
        })
        await Util.assertions.decoding.fail(
          schema,
          { tags: ["AB", "B"] },
          `{ readonly tags: minItems(3) }
└─ ["tags"]
   └─ minItems(3)
      ├─ minItems(3)
      │  └─ From side refinement failure
      │     └─ readonly [minLength(2), ...minLength(2)[]]
      │        └─ [1]
      │           └─ minLength(2)
      │              └─ Predicate refinement failure
      │                 └─ Expected a string at least 2 character(s) long, actual "B"
      └─ minItems(3)
         └─ Predicate refinement failure
            └─ Expected an array of at least 3 item(s), actual ["AB","B"]`,
          { parseOptions: Util.ErrorsAll }
        )
        await Util.assertions.decoding.fail(
          schema,
          { tags: ["AB", "B"] },
          `{ readonly tags: minItems(3) }
└─ ["tags"]
   └─ minItems(3)
      └─ From side refinement failure
         └─ readonly [minLength(2), ...minLength(2)[]]
            └─ [1]
               └─ minLength(2)
                  └─ Predicate refinement failure
                     └─ Expected a string at least 2 character(s) long, actual "B"`
        )
      })

      it("when the 'errors' option is set to 'all', stable filters should be applied only if the from part fails with a `Composite` issue", async () => {
        await Util.assertions.decoding.fail(
          S.Struct({
            tags: S.NonEmptyArray(S.String).pipe(S.minItems(1))
          }),
          {},
          `{ readonly tags: minItems(1) }
└─ ["tags"]
   └─ is missing`,
          { parseOptions: Util.ErrorsAll }
        )
        await Util.assertions.decoding.fail(
          S.Struct({
            tags: S.NonEmptyArray(S.String).pipe(S.minItems(1), S.maxItems(3))
          }),
          {},
          `{ readonly tags: minItems(1) & maxItems(3) }
└─ ["tags"]
   └─ is missing`,
          { parseOptions: Util.ErrorsAll }
        )
      })
    })
  })
})
