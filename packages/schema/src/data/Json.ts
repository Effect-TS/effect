/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export type JsonArray = ReadonlyArray<Json>

/**
 * @since 1.0.0
 */
export type JsonObject = { readonly [key: string]: Json }

/**
 * @since 1.0.0
 */
export type Json =
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject

/**
 * @since 1.0.0
 */
export const JsonSymbol = Symbol("@fp-ts/codec/data/Json")

/**
 * @since 1.0.0
 */
export const JsonSchema: S.Schema<Json> = S.apply(JsonSymbol, O.none, {
  guardFor: () => JsonGuard,
  decoderFor: () => JsonDecoder,
  arbitraryFor: () => JsonArbitrary,
  showFor: () => JsonShow
})

/**
 * @since 1.0.0
 */
export const JsonGuard: G.Guard<Json> = G.make(
  JsonSchema,
  (u: unknown): u is Json =>
    u === null || G.string.is(u) || G.number.is(u) || G.boolean.is(u) ||
    (Array.isArray(u) && u.every(JsonGuard.is)) ||
    (typeof u === "object" && Object.keys(u).every((key) => JsonGuard.is(u[key])))
)

/**
 * @since 1.0.0
 */
export const JsonDecoder: D.Decoder<unknown, Json> = D.fromGuard(
  JsonGuard,
  (u) => DE.notType("Json", u)
)

/**
 * @since 1.0.0
 */
export const JsonArrayDecoder: D.Decoder<Json, JsonArray> = D.make(
  S.array(true, JsonSchema),
  (json) => Array.isArray(json) ? D.succeed(json) : D.fail(DE.notType("Array", json))
)

/**
 * @since 1.0.0
 */
export const JsonObjectDecoder: D.Decoder<Json, JsonObject> = D.make(
  S.indexSignature(JsonSchema),
  (json) =>
    typeof json === "object" && json != null && !Array.isArray(json) ?
      D.succeed(json as JsonObject) :
      D.fail(DE.notType("Object", json))
)

/**
 * @since 1.0.0
 */
export const JsonArbitrary: A.Arbitrary<Json> = A.make(
  JsonSchema,
  (fc) => fc.jsonValue().map((json) => json as Json)
)

/**
 * @since 1.0.0
 */
export const JsonShow: Sh.Show<Json> = Sh.make(
  JsonSchema,
  (json) => JSON.stringify(json)
)
