/**
 * @since 1.0.0
 */
import { identity, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import type * as J from "@fp-ts/schema/data/Json"
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
export interface JsonEncoder<A> extends Encoder<J.Json, A> {}

/**
 * @since 1.0.0
 */
export const provideJsonEncoderFor = (
  provider: Provider
) =>
  <A>(schema: Schema<A>): Encoder<J.Json, A> => {
    const go = (ast: AST): Encoder<J.Json, any> => {
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
        case "Of":
          return E.make(S.make(ast), identity)
        case "Tuple": {
          const components = ast.components.map(go)
          if (O.isSome(ast.restElement)) {
            const restElement = go(ast.restElement.value)
            return E.make<Array<J.Json>, ReadonlyArray<any>>(
              S.make(ast),
              (a) =>
                a.map((ai, i) =>
                  i < components.length ? components[i].encode(ai) : restElement.encode(ai)
                )
            )
          }
          return E.make<Array<J.Json>, ReadonlyArray<any>>(
            S.make(ast),
            (a) => a.map((ai, i) => components[i].encode(ai))
          )
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
          return E.make(S.make(ast), (a) => {
            const out = {}
            for (let i = 0; i < ast.fields.length; i++) {
              const key = ast.fields[i].key
              out[key] = a[key]
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
export const jsonEncoderFor: <A>(schema: Schema<A>) => Encoder<J.Json, A> = provideJsonEncoderFor(
  empty
)
