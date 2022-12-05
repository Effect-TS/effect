import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import { isNonEmpty } from "@fp-ts/data/ReadonlyArray"
import type * as AST from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const PrettyId = I.PrettyId

/**
 * @since 1.0.0
 */
export interface Pretty<in out A> extends Schema<A> {
  readonly pretty: (a: A) => string
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, pretty: Pretty<A>["pretty"]) => Pretty<A> = I.makePretty

const _prettyKey = (key: PropertyKey): string => {
  return typeof key === "symbol" ? String(key) : JSON.stringify(key)
}

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Pretty<any>>,
  oStringIndexSignature: O.Option<Pretty<any>>,
  oSymbolIndexSignature: O.Option<Pretty<any>>
): Pretty<any> =>
  make(
    S.make(ast),
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
            output.push(`${_prettyKey(key)}: undefined`)
            continue
          }
        }
        // ---------------------------------------------
        // handle required fields
        // ---------------------------------------------
        output.push(`${_prettyKey(key)}: ${fields[i].pretty(input[key])}`)
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature) || O.isSome(oSymbolIndexSignature)) {
        if (O.isSome(oStringIndexSignature)) {
          const pretty = oStringIndexSignature.value
          for (const key of Object.keys(input)) {
            output.push(`${_prettyKey(key)}: ${pretty.pretty(input[key])}`)
          }
        }
        if (O.isSome(oSymbolIndexSignature)) {
          const pretty = oSymbolIndexSignature.value
          for (const key of Object.getOwnPropertySymbols(input)) {
            output.push(`${_prettyKey(key)}: ${pretty.pretty(input[key])}`)
          }
        }
      }

      return isNonEmpty(output) ? "{ " + output.join(", ") + " }" : "{}"
    }
  )

const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Pretty<any>>,
  oRestElement: O.Option<Pretty<any>>
): Pretty<any> =>
  make(
    S.make(ast),
    (input: ReadonlyArray<unknown>) => {
      const output: Array<string> = []
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        const pretty = components[i]
        output[i] = pretty.pretty(input[i])
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const pretty = oRestElement.value
        for (; i < input.length; i++) {
          output[i] = pretty.pretty(input[i])
        }
      }

      return "[" + output.join(",") + "]"
    }
  )

const _union = (
  ast: AST.Union,
  members: ReadonlyArray<readonly [Guard<any>, Pretty<any>]>
): Pretty<any> =>
  make(S.make(ast), (a) => {
    const index = members.findIndex(([guard]) => guard.is(a))
    return members[index][1].pretty(a)
  })

const _lazy = <A>(
  f: () => Pretty<A>
): Pretty<A> => {
  const get = I.memoize<void, Pretty<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().pretty(a)
  )
}

/**
 * @since 1.0.0
 */
export const providePrettyFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Pretty<A> => {
    const go = (ast: AST.AST): Pretty<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(PrettyId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Pretty compiler, data type ${ast.id.description?.toString()}`
          )
        }
        case "Of":
          return make(S.make(ast), (input) => {
            if (input === undefined) {
              return "undefined"
            }
            return JSON.stringify(input)
          })
        case "Tuple":
          return _tuple(ast, ast.components.map(go), pipe(ast.restElement, O.map(go)))
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.stringIndexSignature, O.map((is) => go(is.value))),
            pipe(ast.symbolIndexSignature, O.map((is) => go(is.value)))
          )
        case "Union": {
          return _union(ast, ast.members.map((m) => [G.guardFor(S.make(m)), go(m)]))
        }
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const prettyFor: <A>(schema: Schema<A>) => Pretty<A> = providePrettyFor(empty)
