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
  [I.DecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder,
  [I.PrettyId]: () => Pretty
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<JsonArray> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard<JsonArray>(Schema, I.isJsonArray)

/** @internal */
export const Decoder = I.fromRefinement<JsonArray>(
  Schema,
  I.isJsonArray,
  (u) => DE.notType("JsonArray", u)
)

const Encoder = I.makeEncoder<unknown, JsonArray>(Schema, identity)

const Arbitrary = I.makeArbitrary<JsonArray>(
  Schema,
  (fc) => fc.array(fc.jsonValue().map((json) => json as Json))
)

const Pretty = I.makePretty<JsonArray>(Schema, (json) => JSON.stringify(json))
