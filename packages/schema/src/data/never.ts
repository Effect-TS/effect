/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import { GuardId, JsonDecoderId } from "@fp-ts/codec/internal/Interpreter"
import * as S from "@fp-ts/codec/Schema"
import type * as support from "@fp-ts/codec/Support"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/never")

/**
 * @since 1.0.0
 */
export const Support: support.Support = new Map([
  [GuardId, new Map<symbol, Function>([[id, () => Guard]])],
  [JsonDecoderId, new Map<symbol, Function>([[id, () => Decoder]])]
])
/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = S.declare(id, Support) as any

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
