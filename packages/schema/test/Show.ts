import type { DSL } from "@fp-ts/codec/DSL"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"

const set = <P, E, A>(item: S.Schema<P, E, A>): S.Schema<P | "Set", E, Set<A>> =>
  S.constructor("Set", item)

const showSet = (type: string) => `Set<${type}>`

export const showFor = <P extends string>(map: Record<P, any>) => {
  const f = (dsl: DSL): string => {
    switch (dsl._tag) {
      case "ConstructorDSL": {
        const constructor: (type: string) => string = map[dsl.name]
        return constructor(f(dsl.type))
      }
      case "StringDSL":
        return "string"
      case "NumberDSL":
        return "number"
      case "BooleanDSL":
        return "boolean"
      case "LiteralDSL":
        return JSON.stringify(dsl.literal)
      case "TupleDSL":
        return "[" + pipe(dsl.components.map(f).join(", ")) + "]"
      case "UnionDSL":
        return pipe(dsl.members.map(f).join(" | "))
      case "StructDSL":
        return "{ " + pipe(
          dsl.fields.map((field) =>
            `${field.readonly ? "readonly " : ""}${String(field.key)}${
              field.optional ? "?" : ""
            }: ${f(field.value)}`
          ).join(", ")
        ) + " }"
      case "IndexSignatureDSL":
        return `{ ${dsl.readonly ? "readonly " : ""}[_: ${dsl.key}]: ${f(dsl.value)} }`
      case "ArrayDSL":
        return `${dsl.readonly ? "Readonly" : ""}Array<${f(dsl.item)}>`
    }
  }
  return <E, A>(schema: Schema<P, E, A>): string => f(schema)
}

describe("Show", () => {
  const show = showFor({
    Set: showSet
  })

  it("constructor", () => {
    const schema = set(set(S.string))
    expect(pipe(schema, show)).toEqual("Set<Set<string>>")
  })

  describe("show", () => {
    it("struct", () => {
      const schema = S.struct({
        a: S.string,
        b: S.number
      })
      expect(pipe(schema, show)).toEqual(
        "{ readonly a: string, readonly b: number }"
      )
    })

    it("constructor", () => {
      const schema = S.struct({
        a: set(S.string)
      })
      expect(pipe(schema, show)).toEqual(
        "{ readonly a: Set<string> }"
      )
    })

    it("ReadonlyArray", () => {
      const schema = S.array(S.string, true)
      expect(pipe(schema, show)).toEqual(
        "ReadonlyArray<string>"
      )
    })

    it("Array", () => {
      const schema = S.array(S.string, false)
      expect(pipe(schema, show)).toEqual(
        "Array<string>"
      )
    })

    it("literal", () => {
      const schema = S.literal("a")
      expect(pipe(schema, show)).toEqual(
        "\"a\""
      )
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      expect(pipe(schema, show)).toEqual(
        "{ readonly [_: string]: string }"
      )
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      expect(pipe(schema, show)).toEqual(
        "string | number"
      )
    })

    it("option", () => {
      const schema = S.option(S.string)
      expect(pipe(schema, show)).toEqual(
        "{ readonly _tag: \"None\" } | { readonly _tag: \"Some\", readonly value: string }"
      )
    })

    it("either", () => {
      const schema = S.either(S.string, S.number)
      expect(pipe(schema, show)).toEqual(
        "{ readonly _tag: \"Left\", readonly left: string } | { readonly _tag: \"Right\", readonly right: number }"
      )
    })
  })
})
