/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Json } from "@fp-ts/data/Json"
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
export const JsonEncoderId = I.JsonEncoderId

/**
 * @since 1.0.0
 */
export interface JsonEncoder<A> extends Encoder<Json, A> {}

/**
 * @since 1.0.0
 */
export const provideJsonEncoderFor = (
  provider: Provider
) =>
  <A>(schema: Schema<A>): Encoder<Json, A> => {
    const go = (ast: AST): Encoder<Json, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(I.JsonEncoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for JsonEncoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of": {
          if (I.isValueJsonEncodable(ast.value)) {
            return E._of(ast.value)
          } else {
            throw new Error(`cannot encode a non-Json encodable value`)
          }
        }
        case "Tuple":
          return E._tuple(ast, ast.components.map(go), pipe(ast.restElement, O.map(go)))
        case "Struct":
          return E._struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.stringIndexSignature, O.map((is) => go(is.value)))
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
export const jsonEncoderFor: <A>(schema: Schema<A>) => Encoder<Json, A> = provideJsonEncoderFor(
  empty
)
