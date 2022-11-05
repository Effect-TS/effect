import type { DSL } from "@fp-ts/codec/DSL"
import * as _ from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"

export const show = (dsl: DSL): string => {
  switch (dsl._tag) {
    case "StringDSL":
      return "string"
    case "NumberDSL":
      return "number"
    case "BooleanDSL":
      return "boolean"
    case "LiteralDSL":
      return JSON.stringify(dsl.literal)
    case "TupleDSL":
      return "[" + pipe(dsl.components.map(show).join(", ")) + "]"
    case "UnionDSL":
      return pipe(dsl.members.map(show).join(" | "))
    case "StructDSL":
      return "{ " + pipe(
        dsl.fields.map((field) =>
          `${field.readonly ? "readonly " : ""}${String(field.key)}${field.optional ? "?" : ""}: ${
            show(field.value)
          }`
        ).join(", ")
      ) + " }"
    case "IndexSignatureDSL":
      return `{ ${dsl.readonly ? "readonly " : ""}[_: ${dsl.key}]: ${show(dsl.value)} }`
    case "ArrayDSL":
      return `${dsl.readonly ? "Readonly" : ""}Array<${show(dsl.item)}>`
  }
}

describe("Show", () => {
  describe("show", () => {
    it("field", () => {
      const schema = _.field("a", _.string)
      expect(pipe(schema, show)).toEqual("{ readonly a: string }")
    })

    it("struct", () => {
      const schema = _.struct({
        a: _.string,
        b: _.number
      })
      expect(pipe(schema, show)).toEqual(
        "{ readonly a: string, readonly b: number }"
      )
    })

    it("readonlyArray", () => {
      const schema = _.readonlyArray(_.string)
      expect(pipe(schema, show)).toEqual(
        "ReadonlyArray<string>"
      )
    })

    it("literal", () => {
      const schema = _.literal("a")
      expect(pipe(schema, show)).toEqual(
        "\"a\""
      )
    })

    it("indexSignature", () => {
      const schema = _.indexSignature(_.string)
      expect(pipe(schema, show)).toEqual(
        "{ readonly [_: string]: string }"
      )
    })

    it("union", () => {
      const schema = _.union(_.string, _.number)
      expect(pipe(schema, show)).toEqual(
        "string | number"
      )
    })

    it("option", () => {
      const schema = _.option(_.string)
      expect(pipe(schema, show)).toEqual(
        "{ readonly _tag: \"None\" } | { readonly _tag: \"Some\", readonly value: string }"
      )
    })

    it("either", () => {
      const schema = _.either(_.string, _.number)
      expect(pipe(schema, show)).toEqual(
        "{ readonly _tag: \"Left\", readonly left: string } | { readonly _tag: \"Right\", readonly right: number }"
      )
    })
  })
})
