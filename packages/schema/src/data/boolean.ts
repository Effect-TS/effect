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
export const id = Symbol.for("@fp-ts/codec/data/boolean")

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
export const Schema: S.Schema<boolean> = I.declareSchema(id, O.none, Provider)

const Guard: G.Guard<boolean> = I.makeGuard(
  Schema,
  (u): u is boolean => typeof u === "boolean"
)

const Decoder: D.Decoder<unknown, boolean> = I.fromGuard(
  Guard,
  (u) => DE.notType("boolean", u)
)

const Encoder: E.Encoder<boolean, boolean> = I.makeEncoder(Schema, identity)

const Arbitrary: A.Arbitrary<boolean> = I.makeArbitrary(Schema, (fc) => fc.boolean())

const Show: Sh.Show<boolean> = I.makeShow(Schema, (b) => JSON.stringify(b))
