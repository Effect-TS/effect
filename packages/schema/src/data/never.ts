/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Arbitrary"
import * as D from "@fp-ts/codec/Decoder"
import type * as E from "@fp-ts/codec/Encoder"
import * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"
import { identity } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/never")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder,
  [I.ShowId]: () => Show,
  [I.JsonEncoderId]: () => Encoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = S.union()

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<never> = G.union()

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, never> = D.union()

/**
 * @since 1.0.0
 */
export const Encoder: E.Encoder<never, never> = I.makeEncoder(Schema, identity)

/**
 * @since 1.0.0
 */
export const Arbitrary: A.Arbitrary<never> = A.union()

/**
 * @since 1.0.0
 */
export const Show: Sh.Show<never> = Sh.union()
