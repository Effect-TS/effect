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
export const id = Symbol.for("@fp-ts/schema/data/any")

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
export const Schema: S.Schema<any> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard(Schema, (_u): _u is any => true)

const Decoder = I.makeDecoder<unknown, any>(Schema, I.success)

const Encoder = I.makeEncoder<unknown, any>(Schema, identity)

const Arbitrary = I.makeArbitrary<any>(Schema, (fc) => fc.anything())

const Pretty = I.makePretty<any>(Schema, (a) => JSON.stringify(a))
