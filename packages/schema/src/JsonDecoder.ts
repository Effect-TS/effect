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
        case "Tuple":
          return pipe(
            JA.UnknownDecoder,
            D.compose(D._tuple(
              ast.components.map((c) => [c, go(c)]),
              pipe(ast.restElement, O.map((re) => [re, go(re)])),
              ast.readonly
            ))
          )
        case "Union":
          return pipe(J.UnknownDecoder, D.compose(D.union(...ast.members.map(go))))
        case "Struct":
          return pipe(
            JO.UnknownDecoder,
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
}

/**
 * @since 1.0.0
 */
export const jsonDecoderFor: <A>(schema: Schema<A>) => JsonDecoder<A> = provideJsonDecoderFor(empty)
