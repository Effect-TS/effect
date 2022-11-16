import * as A from "@fp-ts/codec/Annotation"
import type { AST } from "@fp-ts/codec/AST"
import * as B from "@fp-ts/codec/data/boolean"
import * as Str from "@fp-ts/codec/data/string"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { identity, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

interface TypeRep<in out A> extends S.Schema<A> {
  readonly typeRep: string
}

const make = (ast: AST, typeRep: string): TypeRep<any> => ({ ast, typeRep }) as any

export const lazy = <A>(
  name: string,
  f: () => TypeRep<A>
): TypeRep<A> => {
  const schema = S.lazy(f)
  return make(
    schema.ast,
    name
  )
}

const TypeRepAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/TypeRepAnnotation"
) as TypeRepAnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type TypeRepAnnotationId = typeof TypeRepAnnotationId

export interface TypeRepAnnotation {
  readonly _id: TypeRepAnnotationId
  readonly typeRepFor: (
    annotations: A.Annotations,
    ...typeReps: ReadonlyArray<TypeRep<any>>
  ) => TypeRep<any>
}

/**
 * @since 1.0.0
 */
export const typeRepAnnotation = (
  typeRepFor: (
    annotations: A.Annotations,
    ...typeReps: ReadonlyArray<TypeRep<any>>
  ) => TypeRep<any>
): TypeRepAnnotation => ({ _id: TypeRepAnnotationId, typeRepFor })

export const isTypeRepAnnotation = (u: unknown): u is TypeRepAnnotation =>
  typeof u === "object" && u != null && "_id" in u && u["_id"] === TypeRepAnnotationId

const setS = <B extends boolean, A>(
  readonly: B,
  item: S.Schema<A>
): S.Schema<B extends true ? ReadonlySet<A> : Set<A>> =>
  S.declare(
    [
      A.nameAnnotation("@fp-ts/codec/data/Set"),
      typeRepAnnotation(<A>(
        _: A.Annotations,
        item: TypeRep<A>
      ) => set(readonly, item))
    ],
    item
  )

const set = <B extends boolean, A>(
  readonly: B,
  item: TypeRep<A>
): TypeRep<B extends true ? ReadonlySet<A> : Set<A>> =>
  make(
    setS(readonly, item).ast,
    readonly ? `ReadonlySet<${item.typeRep}>` : `Set<${item.typeRep}>`
  )

const bigintS: Schema<bigint> = S.declare([
  A.nameAnnotation("@fp-ts/codec/data/bigint"),
  typeRepAnnotation(() => bigint)
])

const bigint: TypeRep<bigint> = make(bigintS.ast, "bigint")

const go = S.memoize((ast: AST): TypeRep<any> => {
  switch (ast._tag) {
    case "Declaration": {
      if (B.isBoolean(ast.annotations)) {
        return make(S.boolean.ast, "boolean")
      }
      if (Str.isString(ast.annotations)) {
        return make(S.string.ast, "string")
      }
      return pipe(
        A.find(ast.annotations, isTypeRepAnnotation),
        O.map((annotation) => annotation.typeRepFor(ast.annotations, ...ast.nodes.map(go))),
        O.match(() => {
          throw new Error(
            `Missing "TypeRepAnnotation" for ${
              pipe(A.getName(ast.annotations), O.getOrElse("<anonymous data type>"))
            }`
          )
        }, identity)
      )
    }
    case "Number":
      return make(S.number.ast, "number")
    case "Of":
      return make(ast, JSON.stringify(ast.value))
    case "Tuple": {
      const components = ast.components.map(go)
      const restElement = pipe(
        ast.restElement,
        O.map((ast) => (components.length > 0 ? ", " : "") + `...${go(ast).typeRep}[]`),
        O.getOrElse("")
      )
      return make(
        ast,
        `${ast.readonly ? "readonly " : ""}[${
          components.map((c) => c.typeRep).join(", ")
        }${restElement}]`
      )
    }
    case "Union": {
      const members = ast.members.map(go)
      return make(
        ast,
        members.map((m) => m.typeRep).join(" | ")
      )
    }
    case "Struct": {
      const fields = ast.fields.map((field) => go(field.value))
      return make(
        ast,
        "{ " +
          ast.fields.map((field, i) => {
            return `${field.readonly ? "readonly " : ""}${String(field.key)}${
              field.optional ? "?" : ""
            }: ${fields[i].typeRep}`
          }).join(", ") +
          (pipe(
            ast.indexSignature,
            O.map((is) => `readonly [_: string]: ${go(is.value).typeRep}`),
            O.getOrElse("")
          ))
          + " }"
      )
    }
    case "Lazy":
      return lazy(
        pipe(A.getName(ast.annotations), O.getOrElse("<Anonymous Lazy type>")),
        () => go(ast.f())
      )
  }
})

export const unsafeTypeRepFor = S.memoize(<A>(schema: Schema<A>): TypeRep<A> => go(schema.ast))

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
      const CategoryS: S.Schema<Category> = pipe(
        S.lazy<Category>(
          () =>
            S.struct({
              name: S.string,
              categories: setS(false, CategoryS)
            })
        ),
        S.withName("Category")
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
