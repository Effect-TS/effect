import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import type * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

describe(".annotations()", () => {
  it("should return a Schema", () => {
    const schema = S.String.annotations({
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
    deepStrictEqual(schema.ast.annotations, {
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
    assertTrue(S.isSchema(schema))
  })

  it("title", () => {
    const schema = S.String.annotations({ title: "MyString" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.TitleAnnotationId]: "MyString",
      [AST.DescriptionAnnotationId]: "a string"
    })
    assertTrue(S.isSchema(schema))
  })

  it("description", () => {
    const schema = S.String.annotations({ description: "description" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.DescriptionAnnotationId]: "description",
      [AST.TitleAnnotationId]: "string"
    })
    assertTrue(S.isSchema(schema))
  })

  it("examples", () => {
    const schema = S.String.annotations({ examples: ["example"] })
    deepStrictEqual(schema.ast.annotations, {
      [AST.ExamplesAnnotationId]: ["example"],
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    assertTrue(S.isSchema(schema))
  })

  it("default", () => {
    const schema = S.String.annotations({ default: "a" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.DefaultAnnotationId]: "a",
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    assertTrue(S.isSchema(schema))
  })

  it("documentation", () => {
    const schema = S.String.annotations({ documentation: "documentation" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.TitleAnnotationId]: "string",
      [AST.DescriptionAnnotationId]: "a string"
    })
    assertTrue(S.isSchema(schema))
  })

  it("concurrency", () => {
    const schema = S.Struct({ a: S.String }).annotations({ concurrency: 1 })
    deepStrictEqual(schema.ast.annotations, {
      [AST.ConcurrencyAnnotationId]: 1
    })
  })

  it("batching", () => {
    const schema = S.Struct({ a: S.String }).annotations({ batching: "inherit" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.BatchingAnnotationId]: "inherit"
    })
  })

  it("typeConstructor", () => {
    const schema = S.Struct({ a: S.String }).annotations({ typeConstructor: { _tag: "MyTypeConstructor" } })
    deepStrictEqual(schema.ast.annotations, {
      [AST.TypeConstructorAnnotationId]: { _tag: "MyTypeConstructor" }
    })
    deepStrictEqual(
      AST.getTypeConstructorAnnotation(schema.ast),
      Option.some({ _tag: "MyTypeConstructor" })
    )
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

    assertTrue(S.isSchema(schema))
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
    const schema = S.instanceOf(A, {
      pretty: prettyA
    })
    Util.assertions.pretty(schema, new A("value"), `new A("value")`)
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
  strictEqual(schema.ast.annotations["formName"], "a")
})
