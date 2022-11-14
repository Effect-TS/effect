/**
 * @since 1.0.0
 */

import type { Codec } from "@fp-ts/codec/Codec"
import * as DE from "@fp-ts/codec/DecodeError"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import type { Declarations, Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export type Json =
  | boolean
  | number
  | string
  | null
  | ReadonlyArray<Json>
  | { readonly [key: string]: Json }

const Json: Decoder<unknown, Json> = D.fromGuard(G.Json, (u) => DE.notType("Json", u))

const JsonArray: Decoder<Json, ReadonlyArray<Json>> = D.readonlyArray(Json)

const JsonObject: Decoder<Json, { readonly [key: string]: Json }> = D.indexSignature(Json)

const unsafeDecoderFor = (declarations: Declarations) =>
  <A>(schema: Schema<A>): Decoder<Json, A> => {
    const f = (meta: Meta): Decoder<Json, any> => {
      switch (meta._tag) {
        case "Apply": {
          const declaration = S.unsafeGet(meta.symbol)(declarations)
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
          return pipe(JsonArray, D.compose(D.fromTuple(...meta.components.map(f))))
        case "Union":
          return pipe(Json, D.compose(D.union(...meta.members.map(f))))
        case "Struct": {
          const fields = {}
          meta.fields.forEach((field) => {
            fields[field.key] = f(field.value)
          })
          return pipe(JsonObject, D.compose(D.fromStruct(fields)))
        }
        case "IndexSignature":
          return pipe(JsonObject, D.compose(D.fromIndexSignature(f(meta.value))))
        case "Array":
          return pipe(JsonArray, D.compose(D.fromReadonlyArray(f(meta.item))))
        case "Lazy":
          throw new Error("Lazy")
      }
    }
    return f(schema.meta)
  }

/**
 * @since 1.0.0
 */
export const JsonCodec: Codec<Json> = {
  unsafeDecoderFor,
  unsafeEncoderFor: null as any
}
