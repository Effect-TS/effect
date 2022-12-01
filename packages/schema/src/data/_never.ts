/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/schema/Arbitrary"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/never")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder,
  [I.JsonEncoderId]: () => Encoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = S.union()

const Guard: G.Guard<never> = G.guardFor(Schema)

const Decoder: D.Decoder<unknown, never> = D.decoderFor(Schema)

const Encoder: E.Encoder<unknown, never> = E.encoderFor(Schema)

const Arbitrary: A.Arbitrary<never> = A.arbitraryFor(Schema)
