/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Annotation"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = S.declare(Symbol("@fp-ts/codec/data/never"), [
  A.makeNameAnnotation("@fp-ts/codec/data/never"),
  G.makeGuardAnnotation(() => Guard as any),
  D.makeDecoderAnnotation(() => Decoder as any)
]) as any

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<never> = G.make(Schema, (_u: unknown): _u is never => false)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, never> = D.fromGuard(
  Guard,
  (u) => DE.notType("never", u)
)
