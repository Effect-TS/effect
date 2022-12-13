/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"
import type * as AST from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const PrettyId = I.PrettyId

/**
 * @since 1.0.0
 */
export interface Pretty<A> extends Schema<A> {
  readonly pretty: (a: A) => string
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, pretty: Pretty<A>["pretty"]) => Pretty<A> = I.makePretty

/**
 * @since 1.0.0
 */
export const providePrettyFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Pretty<A> => {
    const go = (ast: AST.AST): Pretty<any> => {
      switch (ast._tag) {
        case "TypeAliasDeclaration":
          return pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(I.PrettyId, ast.id),
            O.match(
              () => go(ast.type),
              (handler) =>
                O.isSome(ast.config) ?
                  handler(ast.config.value)(...ast.typeParameters.map(go)) :
                  handler(...ast.typeParameters.map(go))
            )
          )
        case "LiteralType":
          return make(I.makeSchema(ast), _literalType)
        case "UndefinedKeyword":
          return make(I._undefined, () => "undefined")
        case "NeverKeyword":
          return make(I.never, () => {
            throw new Error("cannot pretty print a `never` value")
          }) as any
        case "UnknownKeyword":
          return make(I.unknown, () => {
            throw new Error("cannot pretty print an `unknown` value")
          })
        case "AnyKeyword":
          return make(I.any, () => {
            throw new Error("cannot pretty print an `any` value")
          })
        case "StringKeyword":
          return make(I.string, (s) => JSON.stringify(s))
        case "NumberKeyword":
          return make(I.number, (n) => JSON.stringify(n))
        case "BooleanKeyword":
          return make(I.boolean, (b) => JSON.stringify(b))
        case "BigIntKeyword":
          return make(I.boolean, (bi) => `${bi.toString()}n`)
        case "SymbolKeyword":
          return make(I.symbol, (s) => String(s))
        case "Tuple":
          return _tuple(
            ast,
            ast.components.map((c) => go(c.value)),
            pipe(ast.rest, O.map(go))
          )
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.indexSignatures.string, O.map((is) => go(is.value))),
            pipe(ast.indexSignatures.symbol, O.map((is) => go(is.value)))
          )
        case "Union":
          return _union(ast, ast.members.map((m) => [G.guardFor(I.makeSchema(m)), go(m)]))
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const prettyFor: <A>(schema: Schema<A>) => Pretty<A> = providePrettyFor(P.empty)

const _literalType = (literal: AST.Literal): string =>
  typeof literal === "bigint" ? literal.toString() : JSON.stringify(literal)

const _propertyKey = (key: PropertyKey): string =>
  typeof key === "symbol" ? String(key) : JSON.stringify(key)

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Pretty<any>>,
  oStringIndexSignature: O.Option<Pretty<any>>,
  oSymbolIndexSignature: O.Option<Pretty<any>>
): Pretty<any> =>
  make(
    I.makeSchema(ast),
    (input: { readonly [_: string | symbol]: unknown }) => {
      const output: Array<string> = []
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        // ---------------------------------------------
        // handle optional fields
        // ---------------------------------------------
        const optional = field.optional
        if (optional) {
          if (!Object.prototype.hasOwnProperty.call(input, key)) {
            continue
          }
          if (input[key] === undefined) {
            output.push(`${_propertyKey(key)}: undefined`)
            continue
          }
        }
        // ---------------------------------------------
        // handle required fields
        // ---------------------------------------------
        output.push(`${_propertyKey(key)}: ${fields[i].pretty(input[key])}`)
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature) || O.isSome(oSymbolIndexSignature)) {
        if (O.isSome(oStringIndexSignature)) {
          const pretty = oStringIndexSignature.value
          for (const key of Object.keys(input)) {
            output.push(`${_propertyKey(key)}: ${pretty.pretty(input[key])}`)
          }
        }
        if (O.isSome(oSymbolIndexSignature)) {
          const pretty = oSymbolIndexSignature.value
          for (const key of Object.getOwnPropertySymbols(input)) {
            output.push(`${_propertyKey(key)}: ${pretty.pretty(input[key])}`)
          }
        }
      }

      return isNonEmpty(output) ? "{ " + output.join(", ") + " }" : "{}"
    }
  )

const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Pretty<any>>,
  oRest: O.Option<Pretty<any>>
): Pretty<any> =>
  make(
    I.makeSchema(ast),
    (input: ReadonlyArray<unknown>) => {
      const output: Array<string> = []
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        // ---------------------------------------------
        // handle optional components
        // ---------------------------------------------
        if (ast.components[i].optional && input[i] === undefined) {
          if (i < input.length) {
            output[i] = "undefined"
          }
        } else {
          const pretty = components[i]
          output[i] = pretty.pretty(input[i])
        }
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRest)) {
        const pretty = oRest.value
        for (; i < input.length; i++) {
          output[i] = pretty.pretty(input[i])
        }
      }

      return "[" + output.join(", ") + "]"
    }
  )

const _union = (
  ast: AST.Union,
  members: ReadonlyArray<readonly [Guard<any>, Pretty<any>]>
): Pretty<any> =>
  make(I.makeSchema(ast), (a) => {
    const index = members.findIndex(([guard]) => guard.is(a))
    return members[index][1].pretty(a)
  })

const _lazy = <A>(
  f: () => Pretty<A>
): Pretty<A> => {
  const get = I.memoize<void, Pretty<A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (a) => get().pretty(a)
  )
}
