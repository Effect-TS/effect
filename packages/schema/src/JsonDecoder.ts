/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Json } from "@fp-ts/data/Json"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import * as J from "@fp-ts/schema/data/Json"
import * as JA from "@fp-ts/schema/data/JsonArray"
import * as JO from "@fp-ts/schema/data/JsonObject"
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
export const JsonDecoderId = I.JsonDecoderId

/**
 * @since 1.0.0
 */
export interface JsonDecoder<A> extends Decoder<Json, A> {}

/**
 * @since 1.0.0
 */
export const provideJsonDecoderFor = (provider: Provider) => {
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
          return D.of(ast.value)
        case "Tuple": {
          const decoder = D.tuple<Json, ReadonlyArray<JsonDecoder<unknown>>>(
            ...ast.components.map(go)
          )
          const oRestElement = pipe(ast.restElement, O.map(go))
          return pipe(
            JA.UnknownDecoder,
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
        case "Union":
          return pipe(J.UnknownDecoder, D.compose(D.union(...ast.members.map(go))))
        case "Struct": {
          const fields: Record<PropertyKey, JsonDecoder<any>> = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const decoder = D.struct<Json, Record<PropertyKey, JsonDecoder<any>>>(fields)
          const oStringIndexSignature = pipe(ast.stringIndexSignature, O.map((is) => go(is.value)))
          return pipe(
            JO.UnknownDecoder,
            D.compose(D.make(S.make(ast), (u) => {
              const t = decoder.decode(u)
              if (O.isSome(oStringIndexSignature)) {
                const stringIndexSignature = D.stringIndexSignature(oStringIndexSignature.value)
                return pipe(
                  t,
                  D.flatMap((out) =>
                    pipe(
                      stringIndexSignature.decode(u),
                      D.map((rest) => ({ ...out, ...rest }))
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
export const jsonDecoderFor: <A>(schema: Schema<A>) => JsonDecoder<A> = provideJsonDecoderFor(empty)
