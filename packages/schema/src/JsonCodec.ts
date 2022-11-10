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
import * as C from "@fp-ts/data/Context"
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

const Json: Decoder<unknown, DE.Type, Json> = D.fromRefinement(isJson, (u) => DE.type("Json", u))

const isJsonArray = (json: Json): json is ReadonlyArray<Json> => Array.isArray(json)

const JsonArray: Decoder<Json, DE.Type, ReadonlyArray<Json>> = D.fromRefinement(
  isJsonArray,
  (json) => DE.type("JsonArray", json)
)

export const isJsonObject = (json: Json): json is { readonly [key: string]: Json } =>
  json !== null && typeof json === "object" && (!Array.isArray(json))

const JsonObject: Decoder<Json, DE.Type, { readonly [key: string]: Json }> = D.fromRefinement(
  isJsonObject,
  (json) => DE.type("JsonObject", json)
)

const decoderFor = <P>(ctx: C.Context<P>) => {
  const f = (meta: Meta): Decoder<Json, any, any> => {
    switch (meta._tag) {
      case "Constructor": {
        const service = pipe(ctx, C.get(meta.tag as any)) as any
        return service.decoder(meta.metas.map(f))
      }
      case "String":
        return D.string
      case "Number":
        return D.number
      case "Boolean":
        return D.boolean
      case "Literal":
        return D.literal(meta.literal)
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
  return <E, A>(schema: Schema<P, E, A>): Decoder<Json, E, A> => f(schema)
}

/**
 * @since 1.0.0
 */
export const JsonCodec: Codec<Json> = {
  decoderFor,
  encoderFor: null as any
}
