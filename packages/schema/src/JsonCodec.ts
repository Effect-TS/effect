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
import type { Meta } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { identity, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const unsafeDecoderFor = <A>(schema: Schema<A>): Decoder<J.Json, A> => {
  const f = (meta: Meta): Decoder<J.Json, any> => {
    switch (meta._tag) {
      case "Apply": {
        const declaration = meta.declaration
        if (declaration.decoderFor !== undefined) {
          return O.isSome(meta.config) ?
            declaration.decoderFor(meta.config.value, ...meta.metas.map(f)) :
            declaration.decoderFor(...meta.metas.map(f))
        }
        throw new Error(`Missing "decoderFor" declaration for ${meta.symbol.description}`)
      }
      case "Never":
        return D.never as any
      case "Unknown":
        return D.unknown
      case "Any":
        return D.any
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
      case "Tuple":
        return pipe(Json.JsonArrayDecoder, D.compose(D.fromTuple(...meta.components.map(f))))
      case "Union":
        return pipe(Json.JsonDecoder, D.compose(D.union(...meta.members.map(f))))
      case "Struct": {
        const fields = {}
        meta.fields.forEach((field) => {
          fields[field.key] = f(field.value)
        })
        return pipe(Json.JsonObjectDecoder, D.compose(D.fromStruct(fields)))
      }
      case "IndexSignature":
        return pipe(Json.JsonObjectDecoder, D.compose(D.fromIndexSignature(f(meta.value))))
      case "Array":
        return pipe(Json.JsonArrayDecoder, D.compose(D.fromReadonlyArray(f(meta.item))))
      case "Lazy":
        return D.lazy(meta.symbol, () => f(meta.f()))
    }
  }
  return f(schema.meta)
}

const unsafeEncoderFor = <A>(schema: Schema<A>): Encoder<J.Json, A> => {
  const f = (meta: Meta): Encoder<J.Json, any> => {
    switch (meta._tag) {
      case "Apply": {
        const declaration = meta.declaration
        if (declaration.encoderFor !== undefined) {
          return O.isSome(meta.config) ?
            declaration.encoderFor(meta.config.value, ...meta.metas.map(f)) :
            declaration.encoderFor(...meta.metas.map(f))
        }
        throw new Error(`Missing "encoderFor" declaration for ${meta.symbol.description}`)
      }
      case "Never":
        throw new Error("Never")
      case "Unknown":
        throw new Error("Unknown")
      case "Any":
        throw new Error("Any")
      case "String":
        return E.make(S.string, identity)
      case "Number":
        return E.make(S.number, identity)
      case "Boolean":
        return E.make(S.boolean, identity)
      case "Of":
        if (Json.JsonGuard.is(meta.value)) {
          return E.make(S.of(meta.value), identity)
        }
        throw new Error("Of value is not a JSON")
      case "Tuple": {
        const components = meta.components.map(f)
        if (O.isSome(meta.restElement)) {
          const restElement = f(meta.restElement.value)
          return E.make(
            S.tuple(true, ...components),
            (a) =>
              a.map((ai, i) =>
                i < components.length ? components[i].encode(ai) : restElement.encode(ai)
              )
          )
        }
        return E.make(
          S.tuple(true, ...components),
          (a) => a.map((ai, i) => components[i].encode(ai))
        )
      }
      case "Union": {
        const members = meta.members.map(f)
        const guards = meta.members.map((member) => G.unsafeGuardFor(S.make(member)))
        return E.make(S.union(...members), (a) => {
          const index = guards.findIndex((guard) => guard.is(a))
          return members[index].encode(a)
        })
      }
      case "Struct": {
        const fields = meta.fields.map((field) => f(field.value))
        const schemas = {}
        meta.fields.forEach((field, i) => {
          schemas[field.key] = fields[i]
        })
        return E.make(S.struct(schemas), (a) => {
          const out = {}
          meta.fields.forEach((field) => {
            out[field.key] = a[field.key]
          })
          return out
        })
      }
      case "IndexSignature": {
        const value = f(meta.value)
        return E.make(S.indexSignature(value), value.encode)
      }
      case "Array": {
        const item = f(meta.item)
        return E.make(S.array(true, item), (a) => a.map(item.encode))
      }
      case "Lazy":
        return E.lazy(meta.symbol, () => f(meta.f()))
    }
  }
  return f(schema.meta)
}

/**
 * @since 1.0.0
 */
export const JsonCodec: Codec<J.Json> = {
  unsafeDecoderFor,
  unsafeEncoderFor
}
