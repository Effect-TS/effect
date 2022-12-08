/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as String from "@fp-ts/data/String"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/string")

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder,
  [I.PrettyId]: () => Pretty
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<string> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard<string>(Schema, String.isString)

const Decoder = I.makeDecoder<unknown, string>(
  Schema,
  (u) => Guard.is(u) ? I.success(u) : I.failure(DE.notType("string", u))
)

const Encoder = I.makeEncoder<unknown, string>(Schema, identity)

const Arbitrary = I.makeArbitrary<string>(Schema, (fc) => fc.string())

const Pretty = I.makePretty<string>(Schema, (s) => JSON.stringify(s))
