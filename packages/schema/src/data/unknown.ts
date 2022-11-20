/**
 * @since 1.0.0
 */
import type * as A from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import type * as D from "@fp-ts/codec/Decoder"
import type * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type * as S from "@fp-ts/codec/Schema"
import type * as Sh from "@fp-ts/codec/Show"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/unknown")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder,
  [I.ShowId]: () => Show
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<unknown> = I.declareSchema(id, Provider)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<unknown> = I.makeGuard(Schema, (_u): _u is unknown => true)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, any> = I.fromGuard(
  Guard,
  (u) => DE.notType("any", u)
)

/**
 * @since 1.0.0
 */
export const Arbitrary: A.Arbitrary<unknown> = I.makeArbitrary(Schema, (fc) => fc.anything())

/**
 * @since 1.0.0
 */
export const Show: Sh.Show<unknown> = I.makeShow(
  Schema,
  () => "<unknown>"
)
