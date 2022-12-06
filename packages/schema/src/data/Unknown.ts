/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/unknown")

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
export const Schema: S.Schema<unknown> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard(Schema, (_u): _u is unknown => true)

const Decoder = I.makeDecoder<unknown, unknown>(Schema, I.success)

const Encoder = I.makeEncoder<unknown, unknown>(Schema, identity)

const Arbitrary = I.makeArbitrary<unknown>(Schema, (fc) => fc.anything())

const Pretty = I.makePretty<any>(Schema, (a) => JSON.stringify(a))
