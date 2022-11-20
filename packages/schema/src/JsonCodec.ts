/**
 * @since 1.0.0
 */
import type { AST } from "@fp-ts/codec/AST"
import type * as J from "@fp-ts/codec/data/Json"
import * as Json from "@fp-ts/codec/data/Json"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import * as E from "@fp-ts/codec/Encoder"
import * as G from "@fp-ts/codec/Guard"
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
export const provideUnsafeJsonDecoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Decoder<J.Json, A> => {
    const go = (ast: AST): Decoder<J.Json, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(provider)(ast.provider)
          const handler = findHandler(merge, I.JsonDecoderId, ast.id)
          if (O.isSome(handler)) {
            if (O.isSome(ast.config)) {
              return handler.value(ast.config.value)(...ast.nodes.map(go))
            }
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for JsonDecoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return D.of(ast.value)
        case "Tuple": {
          const decoder = D.fromTuple<J.Json, ReadonlyArray<Decoder<J.Json, unknown>>>(
            ...ast.components.map(go)
          )
          const oRestElement = pipe(ast.restElement, O.map(go))
          return pipe(
            Json.JsonArrayJsonDecoder,
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
          return pipe(Json.Decoder, D.compose(D.union(...ast.members.map(go))))
        case "Struct": {
          const fields: Record<PropertyKey, Decoder<J.Json, any>> = {}
          for (const field of ast.fields) {
            fields[field.key] = go(field.value)
          }
          const decoder = D.fromStruct<J.Json, Record<PropertyKey, Decoder<J.Json, any>>>(fields)
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return pipe(
            Json.JsonObjectJsonDecoder,
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

/**
 * @since 1.0.0
 */
export const unsafeJsonDecoderFor: <A>(schema: Schema<A>) => Decoder<J.Json, A> =
  provideUnsafeJsonDecoderFor(empty)

/**
 * @since 1.0.0
 */
export const provideUnsafeJsonEncoderFor = (
  provider: Provider
) =>
  <A>(schema: Schema<A>): Encoder<J.Json, A> => {
    const go = (ast: AST): Encoder<J.Json, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(provider)(ast.provider)
          const handler = findHandler(merge, I.JsonEncoderId, ast.id)
          if (O.isSome(handler)) {
            if (O.isSome(ast.config)) {
              return handler.value(ast.config.value)(...ast.nodes.map(go))
            }
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for JsonEncoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          if (Json.Guard.is(ast.value)) {
            return E.of(ast.value)
          }
          throw new Error("Of value is not a JSON")
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
          const guards = ast.members.map((member) => G.unsafeGuardFor(S.make(member)))
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
export const unsafeJsonEncoderFor: <A>(schema: Schema<A>) => Encoder<J.Json, A> =
  provideUnsafeJsonEncoderFor(empty)
