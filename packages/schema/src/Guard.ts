/**
 * @since 1.0.0
 */

import type { AST } from "@fp-ts/codec/AST"
import * as I from "@fp-ts/codec/internal/common"
import type { Provider } from "@fp-ts/codec/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export const GuardId = I.GuardId

/**
 * @since 1.0.0
 */
export interface Guard<in out A> extends Schema<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make: <A>(
  schema: Schema<A>,
  is: Guard<A>["is"]
) => Guard<A> = I.makeGuard

/**
 * @since 1.0.0
 */
export const UnknownArray: Guard<ReadonlyArray<unknown>> = make(
  S.array(S.unknown),
  (u): u is ReadonlyArray<unknown> => Array.isArray(u)
)

/**
 * @since 1.0.0
 */
export const UnknownIndexSignature: Guard<{ readonly [_: string]: unknown }> = make(
  S.indexSignature(S.unknown),
  (u): u is { readonly [_: string]: unknown } =>
    typeof u === "object" && u != null && !Array.isArray(u)
)

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  f: () => Guard<A>
): Guard<A> => {
  const get = S.memoize<void, Guard<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a): a is A => get().is(a)
  )
}

/**
 * @since 1.0.0
 */
export const provideUnsafeGuardFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Guard<A> => {
    const go = (ast: AST): Guard<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.GuardId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Guard interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return make(S.make(ast), (u): u is any => u === ast.value)
        case "Tuple": {
          const components = ast.components.map(go)
          const oRestElement = pipe(ast.restElement, O.map(go))
          return make(
            S.make(ast),
            (a): a is any => {
              if (UnknownArray.is(a)) {
                if (components.every((guard, i) => guard.is(a[i]))) {
                  if (O.isSome(oRestElement)) {
                    const restElement = oRestElement.value
                    // skip when `ReadonlyArray<unknown>`
                    if (restElement.ast !== S.unknown.ast) {
                      return a.slice(components.length).every(restElement.is)
                    }
                  }
                  return true
                }
              }
              return false
            }
          )
        }
        case "Union": {
          const members = ast.members.map(go)
          return make(
            S.make(ast),
            (a): a is any => members.some((guard) => guard.is(a))
          )
        }
        case "Struct": {
          const fields: any = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return make(
            S.make(ast),
            (a): a is any => {
              if (!UnknownIndexSignature.is(a)) {
                return false
              }
              for (const key of Object.keys(fields)) {
                if (!fields[key].is(a[key])) {
                  return false
                }
              }
              if (O.isSome(oIndexSignature)) {
                const indexSignature = oIndexSignature.value
                // skip when `{ readonly [_: string]: unknown }`
                if (indexSignature.ast !== S.unknown.ast) {
                  for (const key of Object.keys(a)) {
                    if (!(key in fields) && !indexSignature.is(a[key])) {
                      return false
                    }
                  }
                }
              }
              return true
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
export const unsafeGuardFor: <A>(schema: Schema<A>) => Guard<A> = provideUnsafeGuardFor(empty)
