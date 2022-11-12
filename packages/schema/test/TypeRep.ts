import type { Meta } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

const bigint: S.Schema<bigint> = S.declare({
  typeRepFor: () => "bigint"
})

const set = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.declare({
    typeRepFor: (s: string) => `Set<${s}>`
  }, item)

const option = <A>(
  item: S.Schema<A>
): S.Schema<Option<A>> => S.declare({ typeRepFor: (s: string) => `Option<${s}>` }, item)

export const typeRepFor = <A>(schema: Schema<A>): string => {
  const f = (meta: Meta): string => {
    switch (meta._tag) {
      case "Declare":
        return meta.kind.typeRepFor(...meta.metas.map(f))
      case "String":
        return "string"
      case "Number":
        return "number"
      case "Boolean":
        return "boolean"
      case "Equal":
        return JSON.stringify(meta.value)
      case "Tuple": {
        const components = meta.components
        const restElement = pipe(
          meta.restElement,
          O.map((meta) => (components.length > 0 ? ", " : "") + `...${f(meta)}[]`),
          O.getOrElse("")
        )
        return `${meta.readonly ? "readonly " : ""}[${components.map(f).join(", ")}${restElement}]`
      }
      case "Union":
        return meta.members.map(f).join(" | ")
      case "Struct":
        return "{ " +
          meta.fields.map((field) =>
            `${field.readonly ? "readonly " : ""}${String(field.key)}${
              field.optional ? "?" : ""
            }: ${f(field.value)}`
          ).join(", ")
          + " }"
      case "IndexSignature":
        return `{ ${meta.readonly ? "readonly " : ""}[_: ${meta.key}]: ${f(meta.value)} }`
      case "Array":
        return `${meta.readonly ? "Readonly" : ""}Array<${f(meta.item)}>`
    }
  }
  return f(schema)
}

describe("typeRepFor", () => {
  describe("declaration", () => {
    it("kind 0", () => {
      const schema = bigint
      expect(pipe(schema, typeRepFor)).toEqual("bigint")
    })

    it("kind 1", () => {
      const schema = set(S.string)
      expect(pipe(schema, typeRepFor)).toEqual(
        "Set<string>"
      )
    })

    it("option (as declaration)", () => {
      const schema = option(set(S.string))
      expect(pipe(schema, typeRepFor)).toEqual(
        "Option<Set<string>>"
      )
    })
  })

  it("struct", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    expect(pipe(schema, typeRepFor)).toEqual(
      "{ readonly a: string, readonly b: number }"
    )
  })

  it("ReadonlyArray", () => {
    const schema = S.array(true, S.string)
    expect(pipe(schema, typeRepFor)).toEqual(
      "ReadonlyArray<string>"
    )
  })

  it("Array", () => {
    const schema = S.array(false, S.string)
    expect(pipe(schema, typeRepFor)).toEqual(
      "Array<string>"
    )
  })

  it("nonEmptyArray", () => {
    const schema = S.nonEmptyArray(true, S.string, S.number)
    expect(pipe(schema, typeRepFor)).toEqual(
      "readonly [string, ...number[]]"
    )
  })

  it("literal", () => {
    const schema = S.equal("a")
    expect(pipe(schema, typeRepFor)).toEqual(
      "\"a\""
    )
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    expect(pipe(schema, typeRepFor)).toEqual(
      "{ readonly [_: string]: string }"
    )
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    expect(pipe(schema, typeRepFor)).toEqual(
      "string | number"
    )
  })

  it("tuple", () => {
    const schema = S.tuple(true, S.string, S.number)
    expect(pipe(schema, typeRepFor)).toEqual(
      "readonly [string, number]"
    )
  })

  it("option (as structure)", () => {
    const schema = S.option(S.string)
    expect(pipe(schema, typeRepFor)).toEqual(
      "{ readonly _tag: \"None\" } | { readonly _tag: \"Some\", readonly value: string }"
    )
  })

  it("either (as structure)", () => {
    const schema = S.either(S.string, S.number)
    expect(pipe(schema, typeRepFor)).toEqual(
      "{ readonly _tag: \"Left\", readonly left: string } | { readonly _tag: \"Right\", readonly right: number }"
    )
  })

  it("refinement", () => {
    const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
    expect(pipe(schema, typeRepFor)).toEqual(
      "string"
    )
  })
})
