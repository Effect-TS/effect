/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import { GuardInterpreterId, JsonDecoderInterpreterId } from "@fp-ts/codec/internal/Interpreter"
import * as S from "@fp-ts/codec/Schema"
import type { InterpreterSupport } from "@fp-ts/codec/Support"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/never")

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = S.declare(id) as any

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

/**
 * @since 1.0.0
 */
export const Support: InterpreterSupport = new Map([
  [GuardInterpreterId, new Map<symbol, Function>([[id, () => Guard]])],
  [JsonDecoderInterpreterId, new Map<symbol, Function>([[id, () => Decoder]])]
])
