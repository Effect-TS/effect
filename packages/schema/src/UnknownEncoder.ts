/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
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
            `Missing support for UnknownEncoder compiler, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return E._of(ast.value)
        case "Tuple":
          return E._tuple(ast, ast.components.map(go), pipe(ast.restElement, O.map(go)))
        case "Struct":
          return E._struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.stringIndexSignature, O.map((is) => go(is.value))),
            pipe(ast.symbolIndexSignature, O.map((is) => go(is.value)))
          )
        case "Union":
          return E._union(ast, ast.members.map((m) => [G.guardFor(S.make(m)), go(m)]))
        case "Lazy":
          return E._lazy(() => go(ast.f()))
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
