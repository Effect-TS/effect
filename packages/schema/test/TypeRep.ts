import type { Meta } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

const SetSym = Symbol("Set")

const set = <B extends boolean, A>(
  readonly: B,
  item: S.Schema<A>
): S.Schema<B extends true ? ReadonlySet<A> : Set<A>> => S.apply(SetSym, O.some(readonly), item)

const OptionSym = Symbol("Option")

const option = <A>(
  item: S.Schema<A>
): S.Schema<Option<A>> => S.apply(OptionSym, O.none, item)

const bigintSym = Symbol.for("bigint")

const bigint: Schema<bigint> = S.apply(bigintSym, O.none)

const declarations = pipe(
  S.empty,
  S.add(SetSym, {
    typeRepFor: (readonly: boolean, s: string) => readonly ? `ReadonlySet<${s}>` : `Set<${s}>`
  }),
  S.add(OptionSym, {
    typeRepFor: (s: string) => `Option<${s}>`
  }),
  S.add(bigintSym, {
    typeRepFor: () => "bigint"
  })
)

export const typeRepFor = (declarations: S.Declarations) =>
  <A>(schema: Schema<A>): string => {
    const f = (meta: Meta): string => {
      switch (meta._tag) {
        case "Apply": {
          const declaration = S.unsafeGet(meta.symbol)(declarations)
          if (declaration.typeRepFor !== undefined) {
            return O.isSome(meta.config) ?
              declaration.typeRepFor(meta.config.value, ...meta.metas.map(f)) :
              declaration.typeRepFor(...meta.metas.map(f))
          }
          throw new Error(`Missing "typeRepFor" declaration for ${meta.symbol.description}`)
        }
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
          return `${meta.readonly ? "readonly " : ""}[${
            components.map(f).join(", ")
          }${restElement}]`
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
    return f(schema.meta)
  }

describe("typeRepFor", () => {
  const typeRepFor_ = typeRepFor(declarations)

  describe("declaration", () => {
    it("kind 0", () => {
      const schema = bigint
      expect(pipe(schema, typeRepFor_)).toEqual("bigint")
    })

    it("kind 1", () => {
      const schema = set(false, S.string)
      expect(pipe(schema, typeRepFor_)).toEqual(
        "Set<string>"
      )
    })

    it("option (as declaration)", () => {
      const schema = option(set(true, S.number))
      expect(pipe(schema, typeRepFor_)).toEqual(
        "Option<ReadonlySet<number>>"
      )
    })
  })

  it("struct", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    expect(pipe(schema, typeRepFor_)).toEqual(
      "{ readonly a: string, readonly b: number }"
    )
  })

  it("ReadonlyArray", () => {
    const schema = S.array(true, S.string)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "ReadonlyArray<string>"
    )
  })

  it("Array", () => {
    const schema = S.array(false, S.string)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "Array<string>"
    )
  })

  it("nonEmptyArray", () => {
    const schema = S.nonEmptyArray(true, S.string, S.number)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "readonly [string, ...number[]]"
    )
  })

  it("literal", () => {
    const schema = S.equal("a")
    expect(pipe(schema, typeRepFor_)).toEqual(
      "\"a\""
    )
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "{ readonly [_: string]: string }"
    )
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "string | number"
    )
  })

  it("tuple", () => {
    const schema = S.tuple(true, S.string, S.number)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "readonly [string, number]"
    )
  })

  it("option (as structure)", () => {
    const schema = S.option(S.string)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "{ readonly _tag: \"None\" } | { readonly _tag: \"Some\", readonly value: string }"
    )
  })

  it("either (as structure)", () => {
    const schema = S.either(S.string, S.number)
    expect(pipe(schema, typeRepFor_)).toEqual(
      "{ readonly _tag: \"Left\", readonly left: string } | { readonly _tag: \"Right\", readonly right: number }"
    )
  })

  it("refinement", () => {
    const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
    expect(pipe(schema, typeRepFor_)).toEqual(
      "string"
    )
  })
})
