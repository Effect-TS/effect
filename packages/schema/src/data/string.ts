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
import type * as Sh from "@fp-ts/schema/Show"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/string")

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

const Guard: G.Guard<string> = I.makeGuard(Schema, (u): u is string => typeof u === "string")

const Decoder: D.Decoder<unknown, string> = I.makeDecoder(
  Schema,
  (u) => Guard.is(u) ? I.succeed(u) : I.fail(DE.notType("string", u))
)

const Encoder: E.Encoder<string, string> = I.makeEncoder(Schema, identity)

const Arbitrary: A.Arbitrary<string> = I.makeArbitrary(Schema, (fc) => fc.string())

const Show: Sh.Show<string> = I.makeShow(Schema, (n) => JSON.stringify(n))
