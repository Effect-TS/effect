import type { Meta } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

interface TypeRep<in out A> extends S.Schema<A> {
  readonly typeRep: string
}

const make = (meta: Meta, typeRep: string): TypeRep<any> => ({ meta, typeRep }) as any

const SetSym = Symbol("Set")

const setS = <B extends boolean, A>(
  readonly: B,
  item: S.Schema<A>
): S.Schema<B extends true ? ReadonlySet<A> : Set<A>> =>
  S.apply(SetSym, O.some(readonly), {
    typeRepFor: <A>(readonly: boolean, item: TypeRep<A>) => set(readonly, item)
  }, item)

const set = <B extends boolean, A>(
  readonly: B,
  item: TypeRep<A>
): TypeRep<B extends true ? ReadonlySet<A> : Set<A>> =>
  make(
    setS(readonly, item).meta,
    readonly ? `ReadonlySet<${item.typeRep}>` : `Set<${item.typeRep}>`
  )

const bigintSym = Symbol.for("bigint")

const bigintS: Schema<bigint> = S.apply(bigintSym, O.none, {
  typeRepFor: () => bigint
})

const bigint: TypeRep<bigint> = make(bigintS.meta, "bigint")

export const lazy = <A>(
  symbol: symbol,
  f: () => TypeRep<A>
): TypeRep<A> => {
  const schema = S.lazy(symbol, f)
  return make(
    schema.meta,
    symbol.description ?? "<Anonymous Lazy type>"
  )
}

const go = S.memoize((meta: Meta): TypeRep<any> => {
  switch (meta._tag) {
    case "Apply": {
      const declaration = meta.declaration
      if (declaration.typeRepFor !== undefined) {
        return O.isSome(meta.config) ?
          declaration.typeRepFor(meta.config.value, ...meta.metas.map(go)) :
          declaration.typeRepFor(...meta.metas.map(go))
      }
      throw new Error(`Missing "typeRepFor" declaration for ${meta.symbol.description}`)
    }
    case "String":
      return make(S.string.meta, "string")
    case "Number":
      return make(S.number.meta, "number")
    case "Boolean":
      return make(S.boolean.meta, "boolean")
    case "Of":
      return make(meta, JSON.stringify(meta.value))
    case "Tuple": {
      const components = meta.components.map(go)
      const restElement = pipe(
        meta.restElement,
        O.map((meta) => (components.length > 0 ? ", " : "") + `...${go(meta).typeRep}[]`),
        O.getOrElse("")
      )
      return make(
        meta,
        `${meta.readonly ? "readonly " : ""}[${
          components.map((c) => c.typeRep).join(", ")
        }${restElement}]`
      )
    }
    case "Union": {
      const members = meta.members.map(go)
      return make(
        meta,
        members.map((m) => m.typeRep).join(" | ")
      )
    }
    case "Struct": {
      const fields = meta.fields.map((field) => go(field.value))
      return make(
        meta,
        "{ " +
          meta.fields.map((field, i) => {
            return `${field.readonly ? "readonly " : ""}${String(field.key)}${
              field.optional ? "?" : ""
            }: ${fields[i].typeRep}`
          }).join(", ")
          + " }"
      )
    }
    case "IndexSignature": {
      const value = go(meta.value)
      return make(
        meta,
        `{ ${meta.readonly ? "readonly " : ""}[_: ${meta.key}]: ${value.typeRep} }`
      )
    }
    case "Lazy":
      return lazy(meta.symbol, () => go(meta.f()))
  }
})

export const unsafeTypeRepFor = S.memoize(<A>(schema: Schema<A>): TypeRep<A> => go(schema.meta))

describe("unsafeTypeRepFor", () => {
  describe("declaration", () => {
    it("kind 0", () => {
      const schema = bigintS
      const typeRep = pipe(schema, unsafeTypeRepFor)
      expect(typeRep.typeRep).toEqual("bigint")
    })

    it("recursive", () => {
      interface Category {
        readonly name: string
        readonly categories: Set<Category>
      }
      const CategoryS: S.Schema<Category> = S.lazy<Category>(
        Symbol.for("Category"),
        () =>
          S.struct({
            name: S.string,
            categories: setS(false, CategoryS)
          })
      )
      const typeRep = pipe(CategoryS, unsafeTypeRepFor)
      expect(typeRep.typeRep).toEqual(
        "Category"
      )
    })

    it("kind 1", () => {
      const schema = setS(false, S.string)
      expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
        "Set<string>"
      )
    })
  })

  it("struct", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "{ readonly a: string, readonly b: number }"
    )
  })

  it("ReadonlyArray", () => {
    const schema = S.array(true, S.string)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "readonly [...string[]]"
    )
  })

  it("Array", () => {
    const schema = S.array(false, S.string)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "[...string[]]"
    )
  })

  it("nonEmptyArray", () => {
    const schema = S.nonEmptyArray(true, S.string, S.number)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "readonly [string, ...number[]]"
    )
  })

  it("of", () => {
    const schema = S.of("a")
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "\"a\""
    )
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "{ readonly [_: string]: string }"
    )
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "string | number"
    )
  })

  it("tuple", () => {
    const schema = S.tuple(true, S.string, S.number)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "readonly [string, number]"
    )
  })

  it("option (as structure)", () => {
    const schema = S.option(S.string)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "{ readonly _tag: \"None\" } | { readonly _tag: \"Some\", readonly value: string }"
    )
  })

  it("either (as structure)", () => {
    const schema = S.either(S.string, S.number)
    const typeRep = pipe(schema, unsafeTypeRepFor)
    expect(typeRep.typeRep).toEqual(
      "{ readonly _tag: \"Left\", readonly left: string } | { readonly _tag: \"Right\", readonly right: number }"
    )
  })

  it("refinement", () => {
    const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "string"
    )
  })
})
