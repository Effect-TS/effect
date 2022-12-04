/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import * as UnknownArray from "@fp-ts/schema/data/UnknownArray"
import * as UnknownObject from "@fp-ts/schema/data/UnknownObject"
import type { Decoder } from "@fp-ts/schema/Decoder"
import * as D from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

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
        case "Tuple":
          return pipe(
            UnknownArray.UnknownDecoder,
            D.compose(D._tuple(
              ast.components.map((c) => [c, go(c)]),
              pipe(ast.restElement, O.map((re) => [re, go(re)])),
              ast.readonly
            ))
          )
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
        case "Union":
          return D.union(...ast.members.map(go))
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
