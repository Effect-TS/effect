import type * as ParseResult from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe(".annotations()", () => {
  it("should return a Schema", () => {
    const schema = S.String.annotations({
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
    const schema = S.String.annotations({ title: "MyString" })
    expect(schema.ast.annotations).toEqual({
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("description", () => {
    const schema = S.String.annotations({ description: "description" })
    expect(schema.ast.annotations).toEqual({
      [AST.DescriptionAnnotationId]: "description",
      [AST.TitleAnnotationId]: "string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("examples", () => {
    const schema = S.String.annotations({ examples: ["example"] })
    expect(schema.ast.annotations).toEqual({
      [AST.ExamplesAnnotationId]: ["example"],
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("default", () => {
    const schema = S.String.annotations({ default: "a" })
    expect(schema.ast.annotations).toEqual({
      [AST.DefaultAnnotationId]: "a",
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("documentation", () => {
    const schema = S.String.annotations({ documentation: "documentation" })
    expect(schema.ast.annotations).toEqual({
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("concurrency", () => {
    const schema = S.Struct({ a: S.String }).annotations({ concurrency: 1 })
    expect(schema.ast.annotations).toEqual({
      [AST.ConcurrencyAnnotationId]: 1
    })
  })

  it("batching", () => {
    const schema = S.Struct({ a: S.String }).annotations({ batching: "inherit" })
    expect(schema.ast.annotations).toEqual({
      [AST.BatchingAnnotationId]: "inherit"
    })
  })

  it("parseIssueTitle", async () => {
    const getOrderId = ({ actual }: ParseResult.ParseIssue) => {
      if (S.is(S.Struct({ id: S.Number }))(actual)) {
        return `Order with ID ${actual.id}`
      }
    }

    const Order = S.Struct({
      id: S.Number,
      name: S.String,
      totalPrice: S.Number
    }).annotations({
      identifier: "Order",
      parseIssueTitle: getOrderId
    })

    await Util.assertions.decoding.fail(
      Order,
      {},
      `Order
└─ ["id"]
   └─ is missing`
    )
    await Util.assertions.decoding.fail(
      Order,
      { id: 1 },
      `Order with ID 1
└─ ["name"]
   └─ is missing`
    )
  })

  it("message as annotation options", async () => {
    const schema =
      // initial schema, a string
      S.String
        // add an error message for non-string values
        .annotations({ message: () => "not a string" }).pipe(
          // add a constraint to the schema, only non-empty strings are valid
          S.nonEmptyString({ message: () => "required" }),
          // add a constraint to the schema, only strings with a length less or equal than 10 are valid
          S.maxLength(10, { message: (issue) => `${issue.actual} is too long` })
        )

    expect(S.isSchema(schema)).toEqual(true)
    await Util.assertions.decoding.fail(schema, null, "not a string")
    await Util.assertions.decoding.fail(schema, "", "required")
    await Util.assertions.decoding.succeed(schema, "a", "a")
    await Util.assertions.decoding.fail(schema, "aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa is too long")
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

declare module "effect/Schema" {
  namespace Annotations {
    interface Schema<A> extends Doc<A> {
      formName?: string
    }
  }
}

it("should support custom annotations", () => {
  const schema = S.String.annotations({ formName: "a" })
  expect(schema.ast.annotations["formName"]).toEqual("a")
})
