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
export const id = Symbol.for("@fp-ts/schema/data/unknown")

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.UnknownDecoderId]: () => UnknownDecoder,
  [I.JsonDecoderId]: () => UnknownDecoder,
  [I.UnknownEncoderId]: () => UnknownEncoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<unknown> = I.declareSchema(id, O.none, Provider)

const isUnknown = (_u: unknown): _u is unknown => true

const Guard = I.makeGuard(Schema, isUnknown)

const UnknownDecoder = I.fromRefinement<unknown>(
  Schema,
  isUnknown,
  (u) => DE.notType("unknown", u)
)

const UnknownEncoder = I.makeEncoder<unknown, unknown>(Schema, identity)

const Arbitrary = I.makeArbitrary<unknown>(Schema, (fc) => fc.anything())
