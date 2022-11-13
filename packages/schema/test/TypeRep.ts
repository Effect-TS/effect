import type { Meta } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

interface TypeRep<A> extends S.Schema<A> {
  readonly typeRep: string
}

const make = <A>(schema: Schema<A>, typeRep: string): TypeRep<A> =>
  ({ declarations: schema.declarations, meta: schema.meta, typeRep }) as any

const SetSym = Symbol("Set")

const setSchema = <B extends boolean, A>(
  readonly: B,
  item: S.Schema<A>
): S.Schema<B extends true ? ReadonlySet<A> : Set<A>> =>
  S.apply(SetSym, O.some(readonly), pipe(setDeclarations, S.mergeMany([item.declarations])), item)

const set = <B extends boolean, A>(
  readonly: B,
  item: TypeRep<A>
): TypeRep<B extends true ? ReadonlySet<A> : Set<A>> =>
  make(
    setSchema(readonly, item),
    readonly ? `ReadonlySet<${item.typeRep}>` : `Set<${item.typeRep}>`
  )

const setDeclarations = pipe(
  S.empty,
  S.add(SetSym, {
    typeRepFor: <A>(readonly: boolean, item: TypeRep<A>) => set(readonly, item)
  })
)

const bigintSym = Symbol.for("bigint")

const bigintDeclarations = pipe(
  S.empty,
  S.add(bigintSym, {
    typeRepFor: () => bigint
  })
)

const bigintSchema: Schema<bigint> = S.apply(bigintSym, O.none, bigintDeclarations)

const bigint: TypeRep<bigint> = make(bigintSchema, "bigint")

export const typeRepFor = <A>(schema: Schema<A>): TypeRep<A> => {
  const f = (meta: Meta): TypeRep<any> => {
    switch (meta._tag) {
      case "Apply": {
        const declaration = S.unsafeGet(meta.symbol)(schema.declarations)
        if (declaration.typeRepFor !== undefined) {
          return O.isSome(meta.config) ?
            declaration.typeRepFor(meta.config.value, ...meta.metas.map(f)) :
            declaration.typeRepFor(...meta.metas.map(f))
        }
        throw new Error(`Missing "typeRepFor" declaration for ${meta.symbol.description}`)
      }
      case "String":
        return make(S.string, "string")
      case "Number":
        return make(S.number, "number")
      case "Boolean":
        return make(S.boolean, "boolean")
      case "Equal":
        return make(S.equal(meta.value), JSON.stringify(meta.value))
      case "Tuple": {
        const components = meta.components.map(f)
        const restElement = pipe(
          meta.restElement,
          O.map((meta) => (components.length > 0 ? ", " : "") + `...${f(meta).typeRep}[]`),
          O.getOrElse("")
        )
        return make(
          S.tuple(meta.readonly, ...components),
          `${meta.readonly ? "readonly " : ""}[${
            components.map((c) => c.typeRep).join(", ")
          }${restElement}]`
        )
      }
      case "Union": {
        const members = meta.members.map(f)
        return make(
          S.union(...members),
          members.map((m) => m.typeRep).join(" | ")
        )
      }
      case "Struct": {
        const fields = {}
        meta.fields.forEach((field) => {
          fields[field.key] = f(field.value)
        })
        return make(
          S.struct(fields) as any,
          "{ " +
            meta.fields.map((field) => {
              return `${field.readonly ? "readonly " : ""}${String(field.key)}${
                field.optional ? "?" : ""
              }: ${fields[field.key].typeRep}`
            }).join(", ")
            + " }"
        )
      }
      case "IndexSignature": {
        const value = f(meta.value)
        return make(
          S.indexSignature(f(meta.value)),
          `{ ${meta.readonly ? "readonly " : ""}[_: ${meta.key}]: ${value.typeRep} }`
        )
      }
      case "Array": {
        const item = f(meta.item)
        return make(
          S.array(meta.readonly, f(meta.item)),
          `${meta.readonly ? "Readonly" : ""}Array<${item.typeRep}>`
        )
      }
    }
  }
  return f(schema.meta)
}

describe("typeRepFor", () => {
  describe("declaration", () => {
    it("kind 0", () => {
      const schema = bigintSchema
      const typeRep = pipe(schema, typeRepFor)
      expect(typeRep.typeRep).toEqual("bigint")
    })

    it("kind 1", () => {
      const schema = setSchema(false, S.string)
      expect(pipe(schema, typeRepFor).typeRep).toEqual(
        "Set<string>"
      )
    })
  })

  it("struct", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "{ readonly a: string, readonly b: number }"
    )
  })

  it("ReadonlyArray", () => {
    const schema = S.array(true, S.string)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "ReadonlyArray<string>"
    )
  })

  it("Array", () => {
    const schema = S.array(false, S.string)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "Array<string>"
    )
  })

  it("nonEmptyArray", () => {
    const schema = S.nonEmptyArray(true, S.string, S.number)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "readonly [string, ...number[]]"
    )
  })

  it("literal", () => {
    const schema = S.equal("a")
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "\"a\""
    )
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "{ readonly [_: string]: string }"
    )
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "string | number"
    )
  })

  it("tuple", () => {
    const schema = S.tuple(true, S.string, S.number)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "readonly [string, number]"
    )
  })

  it("option (as structure)", () => {
    const schema = S.option(S.string)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "{ readonly _tag: \"None\" } | { readonly _tag: \"Some\", readonly value: string }"
    )
  })

  it("either (as structure)", () => {
    const schema = S.either(S.string, S.number)
    const typeRep = pipe(schema, typeRepFor)
    expect(typeRep.typeRep).toEqual(
      "{ readonly _tag: \"Left\", readonly left: string } | { readonly _tag: \"Right\", readonly right: number }"
    )
  })

  it("refinement", () => {
    const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "string"
    )
  })
})
