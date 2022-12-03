/**
 * @since 1.0.0
 */

import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import * as UnknownArray from "@fp-ts/schema/data/UnknownArray"
import * as UnknownObject from "@fp-ts/schema/data/UnknownObject"
import * as DE from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import * as D from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const UnknownDecoderId = I.UnknownDecoderId

/**
 * @since 1.0.0
 */
export interface UnknownDecoder<A> extends Decoder<unknown, A> {}

/**
 * @since 1.0.0
 */
export const provideUnknownDecoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Decoder<unknown, A> => {
    const go = (ast: AST): Decoder<unknown, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.UnknownDecoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for UnknownDecoder interpreter, data type ${
              String(ast.id.description)
            }`
          )
        }
        case "Of":
          return D.of(ast.value)
        case "Tuple": {
          const decoder = D.tuple(...ast.components.map(go))
          const oRestElement = pipe(ast.restElement, O.map(go))
          return pipe(
            UnknownArray.UnknownDecoder,
            D.compose(D.make(
              S.make(ast),
              (us) => {
                const t = decoder.decode(us)
                if (O.isSome(oRestElement)) {
                  const restElement = D.array(oRestElement.value)
                  return pipe(
                    t,
                    D.flatMap((as) =>
                      pipe(
                        restElement.decode(us.slice(ast.components.length)),
                        D.map((rest) => [...as, ...rest])
                      )
                    )
                  )
                }
                return t
              }
            ))
          )
        }
        case "Union": {
          const members = ast.members.map(go)
          return D.make(S.make(ast), (u) => {
            let es: C.Chunk<DE.DecodeError> = C.empty
            for (const member of members) {
              const t = member.decode(u)
              if (!D.isFailure(t)) {
                return t
              }
              es = C.concat(t.left)(es)
            }
            return C.isNonEmpty(es) ? D.failures(es) : D.failure(DE.notType("never", u))
          })
        }
        case "Struct":
          return pipe(
            UnknownObject.UnknownDecoder,
            D.compose(
              D._struct(
                ast.fields.map((f) => [f, go(f.value)]),
                pipe(ast.stringIndexSignature, O.map((is) => [is, go(is.value)]))
              )
            )
          )
        case "Lazy":
          return D.lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const unknownDecoderFor: <A>(schema: Schema<A>) => Decoder<unknown, A> =
  provideUnknownDecoderFor(
    empty
  )
