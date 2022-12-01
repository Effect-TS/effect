/**
 * @since 1.0.0
 */

import { identity, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const UnknownEncoderId = I.UnknownEncoderId

/**
 * @since 1.0.0
 */
export interface UnknownEncoder<A> extends Encoder<unknown, A> {}

/**
 * @since 1.0.0
 */
export const provideUnknownEncoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Encoder<unknown, A> => {
    const go = (ast: AST): Encoder<unknown, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.UnknownEncoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for UnknownEncoder interpreter, data type ${
              String(ast.id.description)
            }`
          )
        }
        case "Of":
          return E.make(S.of(ast.value), identity)
        case "Tuple": {
          const components = ast.components.map(go)
          const restElement = pipe(ast.restElement, O.map(go), O.getOrNull)
          return E.make(S.make(ast), (a) => {
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
          return E.make(S.make(ast), (a) => {
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
          return E.make(S.make(ast), (a) => {
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
          return E.lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const unknownEncoderFor: <A>(schema: Schema<A>) => Encoder<unknown, A> =
  provideUnknownEncoderFor(
    empty
  )
