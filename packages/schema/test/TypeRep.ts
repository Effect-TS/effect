import type { AST } from "@fp-ts/codec/AST"
import type { Provider } from "@fp-ts/codec/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
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
export const TypeRepInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/TypeRepInterpreter"
)

export type TypeRepInterpreterId = typeof TypeRepInterpreterId

export const provideUnsafeTypeRepFor = (
  support: Provider
) =>
  <A>(schema: Schema<A>): TypeRep<A> => {
    const go = (ast: AST): TypeRep<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(support)(ast.provider)
          const handler = findHandler(
            merge,
            TypeRepInterpreterId,
            ast.id
          )
          if (O.isSome(handler)) {
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for TypeRep interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Unknown":
          return make(S.unknown.ast, "unknown")
        case "String":
          return make(S.string.ast, "string")
        case "Number":
          return make(S.number.ast, "number")
        case "Boolean":
          return make(S.boolean.ast, "boolean")
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
            "<Anonymous Lazy type>",
            () => go(ast.f())
          )
      }
    }

    return go(schema.ast)
  }

describe("unsafeTypeRepFor", () => {
  const unsafeTypeRepFor = provideUnsafeTypeRepFor(empty)
  it("struct", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "{ readonly a: string, readonly b: number }"
    )
  })

  it("array", () => {
    const schema = S.array(S.string)
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "readonly [...string[]]"
    )
  })

  it("nonEmptyArray", () => {
    const schema = S.nonEmptyArray(S.string, S.number)
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
    const schema = S.tuple(S.string, S.number)
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

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(2))
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "string"
    )
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(4))
    expect(pipe(schema, unsafeTypeRepFor).typeRep).toEqual(
      "string"
    )
  })
})
