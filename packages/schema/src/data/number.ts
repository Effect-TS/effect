/**
 * @since 1.0.0
 */
import type * as A from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import type * as D from "@fp-ts/codec/Decoder"
import type * as E from "@fp-ts/codec/Encoder"
import type * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type * as S from "@fp-ts/codec/Schema"
import type * as Sh from "@fp-ts/codec/Show"
import { identity } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/number")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder,
  [I.ShowId]: () => Show,
  [I.JsonEncoderId]: () => Encoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<number> = I.declareSchema(id, O.none, Provider)

const Guard: G.Guard<number> = I.makeGuard(Schema, (u): u is number => typeof u === "number")

const Decoder: D.Decoder<unknown, number> = I.makeDecoder(
  Schema,
  (u) => Guard.is(u) ? isNaN(u) ? I.warn(DE.nan, u) : I.succeed(u) : I.fail(DE.notType("number", u))
)

const Encoder: E.Encoder<number, number> = I.makeEncoder(Schema, identity)

const Arbitrary: A.Arbitrary<number> = I.makeArbitrary(Schema, (fc) => fc.float())

const Show: Sh.Show<number> = I.makeShow(Schema, (n) => JSON.stringify(n))
