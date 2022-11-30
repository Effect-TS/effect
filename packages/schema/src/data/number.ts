/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/number")

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder,
  [I.JsonEncoderId]: () => Encoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<number> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard(Schema, (u): u is number => typeof u === "number")

const Decoder = I.makeDecoder(
  Schema,
  (u) => Guard.is(u) ? isNaN(u) ? I.warn(DE.nan, u) : I.succeed(u) : I.fail(DE.notType("number", u))
)

const Encoder = I.makeEncoder(Schema, identity)

const Arbitrary = I.makeArbitrary(Schema, (fc) => fc.float())
