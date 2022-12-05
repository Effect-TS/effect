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
export const id = Symbol.for("@fp-ts/schema/data/any")

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.UnknownDecoderId]: () => UnknownDecoder,
  [I.JsonDecoderId]: () => UnknownDecoder,
  [I.UnknownEncoderId]: () => UnknownEncoder,
  [I.PrettyId]: () => Pretty
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<any> = I.declareSchema(id, O.none, Provider)

const isAny = (_u: unknown): _u is any => true

const Guard = I.makeGuard(Schema, isAny)

const UnknownDecoder = I.fromRefinement<any>(
  Schema,
  isAny,
  (u) => DE.notType("any", u)
)

const UnknownEncoder = I.makeEncoder<unknown, any>(Schema, identity)

const Arbitrary = I.makeArbitrary<any>(Schema, (fc) => fc.anything())

const Pretty = I.makePretty<any>(Schema, (a) => JSON.stringify(a))
