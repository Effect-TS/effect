/**
 * @since 1.0.0
 */

import { identity, pipe } from "@fp-ts/data/Function"
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
export const EncoderId = I.EncoderId

/**
 * @since 1.0.0
 */
export interface Encoder<out S, in out A> extends Schema<A> {
  readonly encode: (value: A) => S
}

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, encode: Encoder<S, A>["encode"]) => Encoder<S, A> =
  I.makeEncoder

/**
 * @since 1.0.0
 */
export const fromTuple = <S, Components extends ReadonlyArray<Encoder<S, unknown>>>(
  ...components: Components
): Encoder<
  ReadonlyArray<S>,
  { readonly [K in keyof Components]: S.Infer<Components[K]> }
> =>
  make(
    S.tuple<Components>(...components),
    (a) => a.map((ai, i) => components[i].encode(ai))
  )

/**
 * @since 1.0.0
 */
export const toIndexSignature = <S, A>(
  value: Encoder<S, A>
): Encoder<{ readonly [_: string]: S }, { readonly [_: string]: A }> =>
  make(S.indexSignature(value), (a) => {
    const out: any = {}
    for (const key in a) {
      out[key] = value.encode(a[key])
    }
    return out
  })

/**
 * @since 1.0.0
 */
export const lazy = <S, A>(
  f: () => Encoder<S, A>
): Encoder<S, A> => {
  const get = S.memoize<void, Encoder<S, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}

/**
 * @since 1.0.0
 */
export const provideEncoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Encoder<unknown, A> => {
    const go = (ast: AST): Encoder<unknown, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.EncoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Encoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return make(S.of(ast.value), identity)
        case "Tuple": {
          const components = ast.components.map(go)
          const restElement = pipe(ast.restElement, O.map(go), O.getOrNull)
          return make(S.make(ast), (a) => {
            const out = components.map((c, i) => c.encode(a[i]))
            if (restElement !== null) {
              for (let i = components.length; i < a.length; i++) {
                out.push(restElement.encode(a[i]))
              }
            }
            return out
          })
        }
        case "Union": {
          const members = ast.members.map(go)
          const guards = ast.members.map((member) => G.guardFor(S.make(member)))
          return make(S.make(ast), (a) => {
            const index = guards.findIndex((guard) => guard.is(a))
            return members[index].encode(a)
          })
        }
        case "Struct": {
          const fields: Record<PropertyKey, Encoder<unknown, any>> = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const indexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)), O.getOrNull)
          return make(S.make(ast), (a) => {
            const out = {}
            for (const key of Object.keys(a)) {
              if (key in fields) {
                out[key] = fields[key].encode(a[key])
              } else if (indexSignature !== null) {
                out[key] = indexSignature.encode(a[key])
              }
            }
            return out
          })
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
export const encoderFor: <A>(schema: Schema<A>) => Encoder<unknown, A> = provideEncoderFor(empty)
