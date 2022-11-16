/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Annotation"
import * as Arb from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<any> = S.declare([
  A.nameAnnotation("@fp-ts/codec/data/any"),
  G.guardAnnotation(() => Guard),
  {
    _tag: "DecoderAnnotation",
    decoderFor: () => Decoder
  },
  Arb.arbitraryAnnotation(() => Arbitrary)
])

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<any> = G.make(Schema, (_u: unknown): _u is any => true)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, any> = D.fromGuard(
  Guard,
  (u) => DE.notType("any", u)
)

/**
 * @since 1.0.0
 */
export const Arbitrary: Arb.Arbitrary<unknown> = Arb.make(Schema, (fc) => fc.anything())
