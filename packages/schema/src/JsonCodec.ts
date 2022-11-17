/**
 * @since 1.0.0
 */
import type { AST } from "@fp-ts/codec/AST"
import type { Codec } from "@fp-ts/codec/Codec"
import type * as J from "@fp-ts/codec/data/Json"
import * as Json from "@fp-ts/codec/data/Json"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import * as E from "@fp-ts/codec/Encoder"
import * as G from "@fp-ts/codec/Guard"
import {
  JsonDecoderInterpreterId,
  JsonEncoderInterpreterId
} from "@fp-ts/codec/internal/Interpreter"
import * as T from "@fp-ts/codec/internal/These"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type { Support } from "@fp-ts/codec/Support"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Support"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface JsonDecoderSupport {
  (...decoders: ReadonlyArray<Decoder<J.Json, any>>): Decoder<J.Json, any>
}

const unsafeDecoderFor = (support: Support) =>
  <A>(schema: Schema<A>): Decoder<J.Json, A> => {
    const go = (ast: AST): Decoder<J.Json, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(support)(ast.support)
          const handler: O.Option<JsonDecoderSupport> = findHandler(
            merge,
            JsonDecoderInterpreterId,
            ast.id
          )
          if (O.isSome(handler)) {
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for JsonDecoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "String": {
          let out = D.string
          if (ast.minLength !== undefined) {
            out = D.minLength(ast.minLength)(out)
          }
          if (ast.maxLength !== undefined) {
            out = D.maxLength(ast.maxLength)(out)
          }
          return out
        }
        case "Number": {
          let out = D.number
          if (ast.minimum !== undefined) {
            out = D.minimum(ast.minimum)(out)
          }
          if (ast.maximum !== undefined) {
            out = D.maximum(ast.maximum)(out)
          }
          return out
        }
        case "Boolean":
          return D.boolean
        case "Of":
          return D.of(ast.value)
        case "Tuple": {
          const components = ast.components.map(go)
          const oRestElement = pipe(ast.restElement, O.map(go))
          return pipe(
            Json.JsonArrayDecoder,
            D.compose(D.make(
              S.make(ast),
              (is) => {
                const out: Array<unknown> = []
                for (let i = 0; i < components.length; i++) {
                  const t = components[i].decode(is[i])
                  if (T.isLeft(t)) {
                    return T.left(t.left)
                  }
                  out[i] = t.right
                }
                if (O.isSome(oRestElement)) {
                  const restElement = oRestElement.value
                  for (let i = components.length; i < is.length; i++) {
                    const t = restElement.decode(is[i])
                    if (T.isLeft(t)) {
                      return T.left(t.left)
                    }
                    out[i] = t.right
                  }
                }
                return D.succeed(out as any)
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
          const oIndexSignature = pipe(ast.indexSignature, O.map((is) => go(is.value)))
          return pipe(
            Json.JsonObjectDecoder,
            D.compose(D.make(
              S.make(ast),
              (input) => {
                const a = {}
                for (const key of Object.keys(fields)) {
                  const t = fields[key].decode(input[key])
                  if (T.isLeft(t)) {
                    return T.left(t.left)
                  }
                  a[key] = t.right
                }
                if (O.isSome(oIndexSignature)) {
                  const indexSignature = oIndexSignature.value
                  for (const key of Object.keys(input)) {
                    if (!(key in fields)) {
                      const t = indexSignature.decode(input[key])
                      if (T.isLeft(t)) {
                        return T.left(t.left)
                      }
                      a[key] = t.right
                    }
                  }
                }
                return D.succeed(a as any)
              }
            ))
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
export interface JSONEncodeSupport {
  (...encoders: ReadonlyArray<Encoder<J.Json, any>>): Encoder<J.Json, any>
}

const unsafeEncoderFor = (
  support: Support
) =>
  <A>(schema: Schema<A>): Encoder<J.Json, A> => {
    const go = (ast: AST): Encoder<J.Json, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(support)(ast.support)
          const handler: O.Option<JSONEncodeSupport> = findHandler(
            merge,
            JsonEncoderInterpreterId,
            ast.id
          )
          if (O.isSome(handler)) {
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for JsonEncoder interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "String": {
          return E.string
        }
        case "Number":
          return E.number
        case "Boolean":
          return E.boolean
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
          const guards = ast.members.map((member) => G.unsafeGuardFor(empty)(S.make(member)))
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
export const JsonCodec: Codec<J.Json> = {
  unsafeDecoderFor,
  unsafeEncoderFor
}
