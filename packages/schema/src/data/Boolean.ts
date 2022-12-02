/**
 * @since 1.0.0
 */
import { isBoolean } from "@fp-ts/data/Boolean"
import { identity } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/boolean")

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
export const Schema: S.Schema<boolean> = I.declareSchema(id, O.none, Provider)

/**
 * @since 1.0.0
 */
export const Guard = I.makeGuard<boolean>(Schema, isBoolean)

/**
 * @since 1.0.0
 */
export const UnknownDecoder = I.fromRefinement<boolean>(
  Schema,
  isBoolean,
  (u) => DE.notType("boolean", u)
)

/**
 * @since 1.0.0
 */
export const JsonEncoder = I.makeEncoder<boolean, boolean>(Schema, identity)

const Arbitrary = I.makeArbitrary<boolean>(Schema, (fc) => fc.boolean())
