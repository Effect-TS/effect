/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type * as A from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import type * as D from "@fp-ts/schema/Decoder"
import type * as E from "@fp-ts/schema/Encoder"
import type * as G from "@fp-ts/schema/Guard"
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
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.UnknownDecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder,
  [I.UnknownEncoderId]: () => Encoder,
  [I.JsonEncoderId]: () => Encoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<unknown> = I.declareSchema(id, O.none, Provider)

const isUnknown = (_u: unknown): _u is unknown => true

const Guard: G.Guard<unknown> = I.makeGuard(Schema, isUnknown)

const Decoder: D.Decoder<unknown, any> = I.fromRefinement(
  Schema,
  isUnknown,
  (u) => DE.notType("unknown", u)
)

const Encoder: E.Encoder<unknown, unknown> = I.makeEncoder(Schema, identity)

const Arbitrary: A.Arbitrary<unknown> = I.makeArbitrary(Schema, (fc) => fc.anything())
