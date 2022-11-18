/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import { GuardId, JsonDecoderId } from "@fp-ts/codec/internal/Interpreter"
import * as provider from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/never")

/**
 * @since 1.0.0
 */
export const Provider: provider.Provider = provider.make(id, {
  [GuardId]: () => Guard,
  [JsonDecoderId]: () => Decoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = S.declare(id, Provider) as any

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
