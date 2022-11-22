/**
 * @since 1.0.0
 */
import type { AST } from "@fp-ts/codec/AST"
import * as J from "@fp-ts/codec/data/Json"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import * as I from "@fp-ts/codec/internal/common"
import type { Provider } from "@fp-ts/codec/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"

/**
 * @since 1.0.0
 */
export const JsonDecoderId = I.JsonDecoderId

/**
 * @since 1.0.0
 */
export interface JsonDecoder<A> extends Decoder<J.Json, A> {}

/**
 * @since 1.0.0
 */
export const provideUnsafeJsonDecoderFor = (provider: Provider) => {
  const unsafeDecoderFor: <A>(schema: Schema<A>) => JsonDecoder<A> = D.provideUnsafeDecoderFor(
    provider
  )
  return <A>(schema: Schema<A>): JsonDecoder<A> => {
    const go = (ast: AST): JsonDecoder<any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.JsonDecoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for JsonDecoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return unsafeDecoderFor(S.make(ast))
        case "Tuple": {
          const decoder = D.fromTuple<J.Json, ReadonlyArray<JsonDecoder<unknown>>>(
            ...ast.components.map(go)
          )
          const oRestElement = pipe(ast.restElement, O.map(go))
          return pipe(
            unsafeDecoderFor(S.array(J.Schema)),
            D.compose(D.make(
              S.make(ast),
              (us) => {
                const t = decoder.decode(us)
                if (O.isSome(oRestElement)) {
                  const restElement = D.fromArray(oRestElement.value)
                  return pipe(
                    t,
                    D.flatMap((as) =>
                      pipe(
                        restElement.decode(us.slice(ast.components.length)),
                        T.map((rest) => [...as, ...rest])
                      )
                    )
                  )
                }
                return t
              }
            ))
          )
        }
        case "Union":
          return pipe(unsafeDecoderFor(J.Schema), D.compose(unsafeDecoderFor(S.make(ast))))
        case "Struct": {
          const fields: Record<PropertyKey, JsonDecoder<any>> = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const decoder = D.fromStruct<J.Json, Record<PropertyKey, JsonDecoder<any>>>(fields)
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return pipe(
            unsafeDecoderFor(S.indexSignature(J.Schema)),
            D.compose(D.make(S.make(ast), (u) => {
              const t = decoder.decode(u)
              if (O.isSome(oIndexSignature)) {
                const indexSignature = D.fromIndexSignature(oIndexSignature.value)
                return pipe(
                  t,
                  D.flatMap((out) =>
                    pipe(
                      indexSignature.decode(u),
                      T.map((rest) => ({ ...out, ...rest }))
                    )
                  )
                )
              }
              return t
            }))
          )
        }
        case "Lazy":
          return D.lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }
}

/**
 * @since 1.0.0
 */
export const unsafeJsonDecoderFor: <A>(schema: Schema<A>) => JsonDecoder<A> =
  provideUnsafeJsonDecoderFor(empty)
