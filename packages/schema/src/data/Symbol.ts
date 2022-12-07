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
export const id = Symbol.for("@fp-ts/schema/data/symbol")

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
export const Schema: S.Schema<symbol> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard<symbol>(Schema, (u: unknown): u is symbol => typeof u === "symbol")

const Decoder = I.makeDecoder<unknown, symbol>(
  Schema,
  (u) => Guard.is(u) ? I.success(u) : I.failure(DE.notType(id, u))
)

const Encoder = I.makeEncoder<unknown, symbol>(Schema, identity)

const Arbitrary = I.makeArbitrary<symbol>(Schema, (fc) => fc.string().map((s) => Symbol.for(s)))

const Pretty = I.makePretty<symbol>(Schema, (s) => String(s))
