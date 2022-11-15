/**
 * @since 1.0.0
 */
import type { Codec } from "@fp-ts/codec/Codec"
import type * as J from "@fp-ts/codec/data/Json"
import * as Json from "@fp-ts/codec/data/Json"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import * as E from "@fp-ts/codec/Encoder"
import * as G from "@fp-ts/codec/Guard"
import * as T from "@fp-ts/codec/internal/These"
import type { Meta } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const goD = S.memoize((meta: Meta): Decoder<J.Json, any> => {
  switch (meta._tag) {
    case "Apply": {
      const declaration = meta.declaration
      if (declaration.decoderFor !== undefined) {
        return O.isSome(meta.config) ?
          declaration.decoderFor(meta.config.value, ...meta.metas.map(goD)) :
          declaration.decoderFor(...meta.metas.map(goD))
      }
      throw new Error(`Missing "decoderFor" declaration for ${meta.symbol.description}`)
    }
    case "String": {
      let out = D.string
      if (meta.minLength !== undefined) {
        out = D.minLength(meta.minLength)(out)
      }
      if (meta.maxLength !== undefined) {
        out = D.maxLength(meta.maxLength)(out)
      }
      return out
    }
    case "Number": {
      let out = D.number
      if (meta.minimum !== undefined) {
        out = D.minimum(meta.minimum)(out)
      }
      if (meta.maximum !== undefined) {
        out = D.maximum(meta.maximum)(out)
      }
      return out
    }
    case "Boolean":
      return D.boolean
    case "Of":
      return D.of(meta.value)
    case "Tuple": {
      const components = meta.components.map(goD)
      const oRestElement = pipe(meta.restElement, O.map(goD))
      return pipe(
        Json.JsonArrayDecoder,
        D.compose(D.make(
          S.make(meta),
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
      return pipe(Json.Decoder, D.compose(D.union(...meta.members.map(goD))))
    case "Struct": {
      const fields: Record<PropertyKey, Decoder<J.Json, any>> = {}
      for (const field of meta.fields) {
        fields[field.key] = goD(field.value)
      }
      const oIndexSignature = pipe(meta.indexSignature, O.map((is) => goD(is.value)))
      return pipe(
        Json.JsonObjectDecoder,
        D.compose(D.make(
          S.make(meta),
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
      return D.lazy(meta.symbol, () => goD(meta.f()))
  }
})

const unsafeDecoderFor = S.memoize(<A>(schema: Schema<A>): Decoder<J.Json, A> => goD(schema.meta))

const goE = S.memoize((meta: Meta): Encoder<J.Json, any> => {
  switch (meta._tag) {
    case "Apply": {
      const declaration = meta.declaration
      if (declaration.encoderFor !== undefined) {
        return O.isSome(meta.config) ?
          declaration.encoderFor(meta.config.value, ...meta.metas.map(goE)) :
          declaration.encoderFor(...meta.metas.map(goE))
      }
      throw new Error(`Missing "encoderFor" declaration for ${meta.symbol.description}`)
    }
    case "String":
      return E.string
    case "Number":
      return E.number
    case "Boolean":
      return E.boolean
    case "Of":
      if (Json.Guard.is(meta.value)) {
        return E.of(meta.value)
      }
      throw new Error("Of value is not a JSON")
    case "Tuple": {
      const components = meta.components.map(goE)
      if (O.isSome(meta.restElement)) {
        const restElement = goE(meta.restElement.value)
        return E.make<Array<J.Json>, ReadonlyArray<any>>(
          S.make(meta),
          (a) =>
            a.map((ai, i) =>
              i < components.length ? components[i].encode(ai) : restElement.encode(ai)
            )
        )
      }
      return E.make<Array<J.Json>, ReadonlyArray<any>>(
        S.make(meta),
        (a) => a.map((ai, i) => components[i].encode(ai))
      )
    }
    case "Union": {
      const members = meta.members.map(goE)
      const guards = meta.members.map((member) => G.unsafeGuardFor(S.make(member)))
      return E.make(S.make(meta), (a) => {
        const index = guards.findIndex((guard) => guard.is(a))
        return members[index].encode(a)
      })
    }
    case "Struct": {
      return E.make(S.make(meta), (a) => {
        const out = {}
        for (let i = 0; i < meta.fields.length; i++) {
          const key = meta.fields[i].key
          out[key] = a[key]
        }
        return out
      })
    }
    case "Lazy":
      return E.lazy(meta.symbol, () => goE(meta.f()))
  }
})

const unsafeEncoderFor = S.memoize(<A>(schema: Schema<A>): Encoder<J.Json, A> => goE(schema.meta))

/**
 * @since 1.0.0
 */
export const JsonCodec: Codec<J.Json> = {
  unsafeDecoderFor,
  unsafeEncoderFor
}
