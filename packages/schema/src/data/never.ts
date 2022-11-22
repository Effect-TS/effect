/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Arbitrary"
import * as D from "@fp-ts/codec/Decoder"
import * as E from "@fp-ts/codec/Encoder"
import * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"

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

const Guard: G.Guard<never> = G.unsafeGuardFor(Schema)

const Decoder: D.Decoder<unknown, never> = D.unsafeDecoderFor(Schema)

const Encoder: E.Encoder<unknown, never> = E.unsafeEncoderFor(Schema)

const Arbitrary: A.Arbitrary<never> = A.unsafeArbitraryFor(Schema)

const Show: Sh.Show<never> = Sh.unsafeShowFor(Schema)
