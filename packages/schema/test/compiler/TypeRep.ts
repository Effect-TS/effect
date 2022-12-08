import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

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
export const TypeRepId: unique symbol = Symbol.for(
  "@fp-ts/schema/interpreter/TypeRepInterpreter"
)

export type TypeRepId = typeof TypeRepId

export const provideTypeRepFor = (
  provider: Provider
) =>
  <A>(schema: Schema<A>): TypeRep<A> => {
    const go = (ast: AST): TypeRep<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(TypeRepId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for TypeRep compiler, data type ${String(ast.id.description)}`
          )
        }
        case "LiteralType":
          return make(
            ast,
            typeof ast.literal === "bigint" ? ast.literal.toString() : JSON.stringify(ast.literal)
          )
        case "UndefinedKeyword":
          return make(ast, "undefined")
        case "NeverKeyword":
          return make(ast, "never")
        case "UnknownKeyword":
          return make(ast, "unknown")
        case "AnyKeyword":
          return make(ast, "any")
        case "StringKeyword":
          return make(ast, "string")
        case "NumberKeyword":
          return make(ast, "number")
        case "BooleanKeyword":
          return make(ast, "boolean")
        case "BigIntKeyword":
          return make(ast, "bigint")
        case "Tuple": {
          const components = ast.components.map((c) => go(c.value))
          const rest = pipe(
            ast.rest,
            O.map((ast) => (components.length > 0 ? ", " : "") + `...${go(ast).typeRep}[]`),
            O.getOrElse(() => "")
          )
          return make(
            ast,
            `${ast.readonly ? "readonly " : ""}[${
              components.map((c) => c.typeRep).join(", ")
            }${rest}]`
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
                ast.indexSignatures.string,
                O.map((is) => `readonly [_: string]: ${go(is.value).typeRep}`),
                O.getOrElse(() => "")
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

describe("typeRepFor", () => {
  const typeRepFor = provideTypeRepFor(empty)
  it("struct", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "{ readonly a: string, readonly b: number }"
    )
  })

  it("array", () => {
    const schema = S.array(S.string)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "readonly [...string[]]"
    )
  })

  it("literal", () => {
    const schema = S.literal("a")
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "\"a\""
    )
  })

  it("stringIndexSignature", () => {
    const schema = S.stringIndexSignature(S.string)
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
    const schema = S.tuple(S.string, S.number)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "readonly [string, number]"
    )
  })

  it.skip("minLength", () => {
    const schema = pipe(S.string, S.minLength(2))
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "string"
    )
  })

  it.skip("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(4))
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "string"
    )
  })
})
