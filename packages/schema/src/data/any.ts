/**
 * @since 1.0.0
 */
import type * as A from "@fp-ts/codec/Arbitrary"
import * as unknown from "@fp-ts/codec/data/unknown"
import type * as D from "@fp-ts/codec/Decoder"
import type * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type * as S from "@fp-ts/codec/Schema"
import type * as Sh from "@fp-ts/codec/Show"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/any")

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
export const Schema: S.Schema<any> = I.declareSchema(id, O.none, Provider)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<any> = unknown.Guard

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, any> = unknown.Decoder

/**
 * @since 1.0.0
 */
export const Arbitrary: A.Arbitrary<any> = unknown.Arbitrary

/**
 * @since 1.0.0
 */
export const Show: Sh.Show<any> = I.makeShow(Schema, () => "<any>")
