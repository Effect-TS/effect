import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Schema/annotations", () => {
  it("title", () => {
    expect(S.string.pipe(S.title("MyString")).ast.annotations).toEqual({
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
  })

  it("description", () => {
    expect(S.string.pipe(S.description("description")).ast.annotations).toEqual({
      [AST.DescriptionAnnotationId]: "description",
      [AST.TitleAnnotationId]: "string"
    })
  })

  it("examples", () => {
    expect(S.string.pipe(S.examples(["example"])).ast.annotations).toEqual({
      [AST.ExamplesAnnotationId]: ["example"],
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
  })

  it("documentation", () => {
    expect(S.string.pipe(S.documentation("documentation")).ast.annotations).toEqual({
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
  })

  it("message as annotation options", async () => {
    const schema =
      // initial schema, a string
      S.string.pipe(
        // add an error message for non-string values
        S.message(() => "not a string"),
        // add a constraint to the schema, only non-empty strings are valid
        S.nonEmpty({ message: () => "required" }),
        // add a constraint to the schema, only strings with a length less or equal than 10 are valid
        S.maxLength(10, { message: (s) => `${s} is too long` })
      )

    await Util.expectParseFailure(schema, null, "not a string")
    await Util.expectParseFailure(schema, "", "required")
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseFailure(schema, "aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa is too long")
  })

  describe.concurrent("message as annotation", () => {
    it("primitives", async () => {
      const schema = S.string.pipe(S.nonEmpty(), S.message(() => "custom message"))
      await Util.expectParseFailure(schema, "", "custom message")
    })

    it("transformations", async () => {
      const schema = S.NumberFromString.pipe(S.message(() => "custom message"))
      await Util.expectParseFailure(schema, "", "custom message")
    })
  })
})
