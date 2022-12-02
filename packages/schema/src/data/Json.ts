/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import type { Json } from "@fp-ts/data/Json"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/Json")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
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
export const Schema: S.Schema<Json> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard<Json>(Schema, I.isJson)

/**
 * @since 1.0.0
 */
export const UnknownDecoder = I.fromRefinement<Json>(
  Schema,
  I.isJson,
  (u) => DE.notType("Json", u)
)

const JsonEncoder = I.makeEncoder<Json, Json>(Schema, identity)

const Arbitrary = I.makeArbitrary<Json>(Schema, (fc) => fc.jsonValue().map((json) => json as Json))
