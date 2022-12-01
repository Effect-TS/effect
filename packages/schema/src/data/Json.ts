/**
 * @since 1.0.0
 */
import type { Json } from "@fp-ts/data/Json"
import * as O from "@fp-ts/data/Option"
import type * as A from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import type * as D from "@fp-ts/schema/Decoder"
import type * as G from "@fp-ts/schema/Guard"
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
  [I.DecoderId]: () => Decoder,
  [I.UnknownDecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<Json> = I.declareSchema(id, O.none, Provider)

const Guard: G.Guard<Json> = I.makeGuard(Schema, I.isJson)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, Json> = I.fromRefinement(
  Schema,
  I.isJson,
  (u) => DE.notType("Json", u)
)

const Arbitrary: A.Arbitrary<Json> = I.makeArbitrary(
  Schema,
  (fc) => fc.jsonValue().map((json) => json as Json)
)
