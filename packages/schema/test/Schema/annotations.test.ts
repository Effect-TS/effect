import * as AST from "@effect/schema/AST"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > .annotations()", () => {
  it("annotations", () => {
    const schema = S.string.annotations({
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(schema.ast.annotations).toEqual({
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("title", () => {
    const schema = S.string.annotations({ title: "MyString" })
    expect(schema.ast.annotations).toEqual({
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("description", () => {
    const schema = S.string.annotations({ description: "description" })
    expect(schema.ast.annotations).toEqual({
      [AST.DescriptionAnnotationId]: "description",
      [AST.TitleAnnotationId]: "string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("examples", () => {
    const schema = S.string.annotations({ examples: ["example"] })
    expect(schema.ast.annotations).toEqual({
      [AST.ExamplesAnnotationId]: ["example"],
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("default", () => {
    const schema = S.string.pipe(S.default("a"))
    expect(schema.ast.annotations).toEqual({
      [AST.DefaultAnnotationId]: "a",
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("documentation", () => {
    const schema = S.string.pipe(S.documentation("documentation"))
    expect(schema.ast.annotations).toEqual({
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("message as annotation options", async () => {
    const schema =
      // initial schema, a string
      S.string
        // add an error message for non-string values
        .annotations({ message: () => "not a string" }).pipe(
          // add a constraint to the schema, only non-empty strings are valid
          S.nonEmpty({ message: () => "required" }),
          // add a constraint to the schema, only strings with a length less or equal than 10 are valid
          S.maxLength(10, { message: (issue) => `${issue.actual} is too long` })
        )

    expect(S.isSchema(schema)).toEqual(true)
    await Util.expectDecodeUnknownFailure(schema, null, "not a string")
    await Util.expectDecodeUnknownFailure(schema, "", "required")
    await Util.expectDecodeUnknownSuccess(schema, "a", "a")
    await Util.expectDecodeUnknownFailure(schema, "aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa is too long")
  })

  it("pretty", () => {
    class A {
      constructor(readonly a: string) {}
    }
    const prettyA = (): Pretty.Pretty<A> => (instance) => `new A("${instance.a}")`
    const AFromSelf = S.instanceOf(A, {
      pretty: prettyA
    })
    expect(Pretty.make(AFromSelf)(new A("value"))).toEqual(`new A("value")`)
  })
})
