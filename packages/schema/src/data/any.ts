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
export const id = Symbol.for("@fp-ts/schema/data/any")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<any> = I.declareSchema(id, O.none, Provider)

const Guard: G.Guard<any> = I.makeGuard(Schema, (_u): _u is any => true)

const Decoder: D.Decoder<unknown, any> = I.fromGuard(
  Guard,
  (u) => DE.notType("any", u)
)

const Encoder: E.Encoder<unknown, any> = I.makeEncoder(Schema, identity)

const Arbitrary: A.Arbitrary<any> = I.makeArbitrary(Schema, (fc) => fc.anything())
