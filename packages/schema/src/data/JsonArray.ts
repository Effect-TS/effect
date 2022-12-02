/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import type { Json, JsonArray } from "@fp-ts/data/Json"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/JsonArray")

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.UnknownDecoderId]: () => UnknownDecoder,
  [I.JsonDecoderId]: () => UnknownDecoder,
  [I.UnknownEncoderId]: () => JsonEncoder,
  [I.JsonEncoderId]: () => JsonEncoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<JsonArray> = I.declareSchema(id, O.none, Provider)

/**
 * @since 1.0.0
 */
export const Guard = I.makeGuard<JsonArray>(Schema, I.isJsonArray)

/**
 * @since 1.0.0
 */
export const UnknownDecoder = I.fromRefinement<JsonArray>(
  Schema,
  I.isJsonArray,
  (u) => DE.notType("JsonArray", u)
)

/**
 * @since 1.0.0
 */
export const JsonEncoder = I.makeEncoder<JsonArray, JsonArray>(Schema, identity)

/**
 * @since 1.0.0
 */
export const Arbitrary = I.makeArbitrary<JsonArray>(
  Schema,
  (fc) => fc.array(fc.jsonValue().map((json) => json as Json))
)
