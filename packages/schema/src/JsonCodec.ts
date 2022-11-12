/**
 * @since 1.0.0
 */

import type { Codec } from "@fp-ts/codec/Codec"
import * as DE from "@fp-ts/codec/DecodeError"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"

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

/** @internal */
export const isJson = (u: unknown): u is Json =>
  u === null || G.string.is(u) || G.number.is(u) || G.boolean.is(u) ||
  (Array.isArray(u) && u.every(isJson)) || (typeof u === "object" && Object.keys(u).every((key) =>
    isJson(u[key])
  ))

const Json: Decoder<unknown, Json> = D.fromRefinement(isJson, (u) => DE.type("Json", u))

const isJsonArray = (json: Json): json is ReadonlyArray<Json> => Array.isArray(json)

const JsonArray: Decoder<Json, ReadonlyArray<Json>> = D.fromRefinement(
  isJsonArray,
  (json) => DE.type("JsonArray", json)
)

export const isJsonObject = (json: Json): json is { readonly [key: string]: Json } =>
  json !== null && typeof json === "object" && (!Array.isArray(json))

const JsonObject: Decoder<Json, { readonly [key: string]: Json }> = D.fromRefinement(
  isJsonObject,
  (json) => DE.type("JsonObject", json)
)

const decoderFor = <A>(schema: Schema<A>): Decoder<Json, A> => {
  const f = (meta: Meta): Decoder<Json, any> => {
    switch (meta._tag) {
      case "Declare":
        return meta.kind.decoderFor(...meta.metas.map(f))
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
      case "Equal":
        return D.equal(meta.value)
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
    }
  }
  return f(schema)
}

/**
 * @since 1.0.0
 */
export const JsonCodec: Codec<Json> = {
  decoderFor,
  encoderFor: null as any
}
