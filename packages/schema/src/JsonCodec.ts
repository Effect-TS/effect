/**
 * @since 1.0.0
 */
import type { Codec } from "@fp-ts/codec/Codec"
import type * as J from "@fp-ts/codec/data/Json"
import * as Json from "@fp-ts/codec/data/Json"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
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

/**
 * @since 1.0.0
 */
export const JsonCodec: Codec<J.Json> = {
  unsafeDecoderFor,
  unsafeEncoderFor: null as any
}
