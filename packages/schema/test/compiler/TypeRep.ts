import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as AST from "@fp-ts/schema/AST"
import * as DataJson from "@fp-ts/schema/data/Json"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

interface TypeRep<in out A> extends S.Schema<A> {
  readonly typeRep: string
}

const make = (ast: AST.AST, typeRep: string): TypeRep<any> => ({ ast, typeRep }) as any

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
  "@fp-ts/schema/test/compiler/TypeRep"
)

export type TypeRepId = typeof TypeRepId

export const provideTypeRepFor = (
  provider: Provider
) =>
  <A>(schema: Schema<A>): TypeRep<A> => {
    const go = (ast: AST.AST): TypeRep<any> => {
      switch (ast._tag) {
        case "TypeAliasDeclaration":
          return pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(TypeRepId, ast.id),
            O.match(
              () =>
                pipe(
                  ast.typeParameters.map(go),
                  RA.match(
                    () => make(ast, String(ast.id)),
                    (typeParameters) => make(ast, `${String(ast.id)}<${typeParameters.typeRep}>`)
                  )
                ),
              (handler) =>
                O.isSome(ast.config) ?
                  handler(ast.config.value)(...ast.typeParameters.map(go)) :
                  handler(...ast.typeParameters.map(go))
            )
          )
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
        case "SymbolKeyword":
          return make(ast, "symbol")
        case "OptionalType":
          return go(AST.union([AST.undefinedKeyword, ast.type]))
        case "Tuple": {
          const components = ast.components.map(go)
          const rest = pipe(
            ast.rest,
            O.map((ast) => (components.length > 0 ? ", " : "") + `...${go(ast).typeRep}[]`),
            O.getOrElse(() => "")
          )
          return make(
            ast,
            `${ast.isReadonly ? "readonly " : ""}[${
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
                return `${field.isReadonly ? "readonly " : ""}${String(field.key)}${
                  AST.isOptionalType(field.value) ? "?" : ""
                }: ${fields[i].typeRep}`
              }).join(", ") +
              ast.indexSignatures.map((is) => `readonly [_: ${is.key}]: ${go(is.value).typeRep}`)
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
  const typeRepFor = provideTypeRepFor(P.empty)
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

  it("typeAlias", () => {
    const schema = S.array(DataJson.Schema)
    expect(pipe(schema, typeRepFor).typeRep).toEqual(
      "readonly [...Symbol(@fp-ts/schema/data/Json)[]]"
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
