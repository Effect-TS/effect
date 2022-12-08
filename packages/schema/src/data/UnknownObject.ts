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
export const id = Symbol.for("@fp-ts/schema/data/UnknownObject")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder,
  [I.PrettyId]: () => Pretty
})

/**
 * @since 1.0.0
 */
export interface UnknownObject {
  readonly [_: string | symbol]: unknown
}

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<UnknownObject> = I.declareSchema(id, O.none, Provider)

/** @internal */
export const Guard = I.makeGuard<UnknownObject>(Schema, I.isUnknownObject)

/** @internal */
export const Decoder = I.fromRefinement<UnknownObject>(
  Schema,
  I.isUnknownObject,
  (u) => DE.notType("{ readonly [_: string]: unknown }", u)
)

const Encoder = I.makeEncoder<UnknownObject, UnknownObject>(Schema, identity)

const Arbitrary = I.makeArbitrary<UnknownObject>(
  Schema,
  (fc) => fc.dictionary(fc.string(), fc.anything())
)

const Pretty = I.makePretty<any>(Schema, (a) => JSON.stringify(a))
