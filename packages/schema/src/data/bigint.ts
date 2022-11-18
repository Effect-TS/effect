/**
 * @since 1.0.0
 */
import * as G from "@fp-ts/codec/Guard"
import { GuardId } from "@fp-ts/codec/internal/Interpreter"
import * as provider from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/bigint")

/**
 * @since 1.0.0
 */
export const Provider: provider.Provider = provider.make(id, {
  [GuardId]: () => Guard
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<bigint> = S.declare(id, Provider)

/**
 * @since 1.0.0
 */
export const Guard = G.make(
  Schema,
  (input): input is bigint => typeof input === "bigint"
)
