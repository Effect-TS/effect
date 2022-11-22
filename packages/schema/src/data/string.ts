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
export const id = Symbol.for("@fp-ts/codec/data/string")

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
export const Schema: S.Schema<string> = I.declareSchema(id, O.none, Provider)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<string> = I.makeGuard(Schema, (u): u is string => typeof u === "string")

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, string> = I.makeDecoder(
  Schema,
  (u) => Guard.is(u) ? I.succeed(u) : I.fail(DE.notType("string", u))
)

/**
 * @since 1.0.0
 */
export const Encoder: E.Encoder<string, string> = I.makeEncoder(Schema, identity)

/**
 * @since 1.0.0
 */
export const Arbitrary: A.Arbitrary<string> = I.makeArbitrary(Schema, (fc) => fc.string())

/**
 * @since 1.0.0
 */
export const Show: Sh.Show<string> = I.makeShow(Schema, (n) => JSON.stringify(n))
