import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Schema/filter", () => {
  it("filter/ annotation options", () => {
    const schema = S.string.pipe(
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
    const schema = S.struct({ a: S.string, b: S.string }).pipe(
      S.filter((o) =>
        o.b === o.a
          ? Option.none()
          : Option.some(
            ParseResult.parseError([
              ParseResult.key("b", [
                ParseResult.type(S.literal(o.a).ast, o.b, `should be equal to a's value ("${o.a}")`)
              ])
            ])
          )
      )
    )

    await Util.expectParseSuccess(schema, { a: "x", b: "x" })
    await Util.expectParseFailureTree(
      schema,
      { a: "a", b: "b" },
      `error(s) found
└─ ["b"]
   └─ should be equal to a's value ("a")`
    )
  })
})
