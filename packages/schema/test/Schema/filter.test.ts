import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as Option from "effect/Option"
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

  it("Option overloading", async () => {
    const schema = S.Struct({ a: S.String, b: S.String }).pipe(
      S.filter((o) =>
        o.b === o.a
          ? Option.none()
          : Option.some(
            new ParseResult.Type(
              S.Literal(o.a).ast,
              o.b,
              `b should be equal to a's value ("${o.a}")`
            )
          )
      )
    )

    await Util.expectDecodeUnknownSuccess(schema, { a: "x", b: "x" })
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a", b: "b" },
      `{ { readonly a: string; readonly b: string } | predicate }
└─ Predicate refinement failure
   └─ b should be equal to a's value ("a")`
    )
  })
})
