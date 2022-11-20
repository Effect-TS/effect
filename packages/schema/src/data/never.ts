/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/codec/DecodeError"
import type * as D from "@fp-ts/codec/Decoder"
import type * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/never")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<never> = I.declareSchema(id, Provider) as any

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<never> = I.makeGuard(Schema, (_u: unknown): _u is never => false)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, never> = I.fromGuard(
  Guard,
  (u) => DE.notType("never", u)
)
