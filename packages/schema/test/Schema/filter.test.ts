import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("filter", () => {
  it("annotation options", () => {
    const schema = S.String.pipe(
      S.filter((s): s is string => s.length === 1, {
        typeId: Symbol.for("Char"),
        description: "description",
        documentation: "documentation",
        examples: ["examples"],
        identifier: "identifier",
        jsonSchema: { minLength: 1, maxLength: 1 },
        title: "title"
      })
    )
    expect(schema.ast.annotations).toEqual({
      [AST.TypeAnnotationId]: Symbol.for("Char"),
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
    const schema = S.NonEmpty
    Util.expectConstructorSuccess(schema, "a")
    Util.expectConstructorFailure(
      schema,
      "",
      `NonEmpty
└─ Predicate refinement failure
   └─ Expected NonEmpty, actual ""`
    )
  })

  it("the constructor validation can be disabled", () => {
    const schema = S.NonEmpty
    expect(schema.make("", true)).toStrictEqual("")
    expect(schema.make("", { disableValidation: true })).toStrictEqual("")
  })

  describe("ParseIssue overloading", () => {
    it("Type", async () => {
      const schema = S.Struct({ a: S.String, b: S.String }).pipe(
        S.filter((o) =>
          o.b === o.a
            ? undefined
            : new ParseResult.Type(
              S.Literal(o.a).ast,
              o.b,
              `b should be equal to a's value ("${o.a}")`
            )
        )
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

    it("Pointer", async () => {
      const ValidString = S.Trim.pipe(S.minLength(1, { message: () => "ERROR_MIN_LENGTH" }))
      const schema = S.Struct({
        a: S.Struct({
          b: S.String,
          c: ValidString
        }),
        d: S.Tuple(S.String, ValidString)
      }).annotations({ identifier: "Test" }).pipe(S.filter((input) => {
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
            input.d,
            new ParseResult.Type(S.Literal(input.d[0]).ast, input.d[1])
          )
        }
        return true
      }))
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
  })
})
