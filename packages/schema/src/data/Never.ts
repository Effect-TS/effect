/**
 * @since 1.0.0
 */
import { absurd } from "@fp-ts/data/Function"
import type { Json } from "@fp-ts/data/Json"
import * as A from "@fp-ts/schema/Arbitrary"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as UD from "@fp-ts/schema/UnknownDecoder"

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
  [I.UnknownDecoderId]: () => UnknownDecoder,
  [I.JsonDecoderId]: () => UnknownDecoder,
  [I.JsonEncoderId]: () => JsonEncoder,
  [I.UnknownEncoderId]: () => JsonEncoder,
  [I.PrettyId]: () => Pretty
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = S.union()

const Guard = G.guardFor(Schema)

const UnknownDecoder = UD.unknownDecoderFor(Schema)

const JsonEncoder = I.makeEncoder<Json, never>(Schema, absurd)

const Arbitrary = A.arbitraryFor(Schema)

const Pretty = I.makePretty<never>(Schema, absurd)
