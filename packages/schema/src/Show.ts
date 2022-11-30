/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const ShowId = I.ShowId

/**
 * @since 1.0.0
 */
export interface Show<in out A> extends Schema<A> {
  readonly show: (a: A) => string
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, show: Show<A>["show"]) => Show<A> = I.makeShow

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  f: () => Show<A>
): Show<A> => {
  const get = S.memoize<void, Show<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().show(a)
  )
}

/**
 * @since 1.0.0
 */
export const provideShowFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Show<A> => {
    const go = (ast: AST): Show<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.ShowId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Show interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return make(S.make(ast), (a) => JSON.stringify(a))
        case "Tuple": {
          const components: ReadonlyArray<Show<unknown>> = ast.components.map(go)
          return make(S.make(ast), (tuple: ReadonlyArray<unknown>) =>
            "[" +
            tuple.map((c, i) =>
              i < components.length ?
                components[i].show(c) :
                O.isSome(ast.restElement) ?
                go(ast.restElement.value).show(c) :
                ""
            ).join(
              ","
            ) + "]")
        }
        case "Union": {
          const members = ast.members.map(go)
          const guards = ast.members.map((member) => G.guardFor(S.make(member)))
          return make(S.make(ast), (a) => {
            const index = guards.findIndex((Show) => Show.is(a))
            return members[index].show(a)
          })
        }
        case "Struct": {
          const fields: any = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return make(
            S.make(ast),
            (struct: { [_: PropertyKey]: unknown }) => {
              const keys = Object.keys(struct)
              let out = "{"
              for (const key of keys) {
                if (key in fields) {
                  out += `${JSON.stringify(key)}:${fields[key].show(struct[key])},`
                }
              }
              if (O.isSome(oIndexSignature)) {
                const indexSignature = oIndexSignature.value
                for (const key of keys) {
                  if (!(key in fields)) {
                    out += `${JSON.stringify(key)}:${indexSignature.show(struct[key])},`
                  }
                }
              }
              out = out.substring(0, out.length - 1)
              out += "}"
              return out
            }
          )
        }
        case "Lazy":
          return lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const showFor: <A>(schema: Schema<A>) => Show<A> = provideShowFor(empty)
