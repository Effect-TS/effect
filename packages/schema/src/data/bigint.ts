/**
 * @since 1.0.0
 */
import * as G from "@fp-ts/codec/Guard"
import { GuardId } from "@fp-ts/codec/internal/Interpreter"
import * as S from "@fp-ts/codec/Schema"
import type * as support from "@fp-ts/codec/Support"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/bigint")

/**
 * @since 1.0.0
 */
export const Support: support.Support = new Map([
  [GuardId, new Map<symbol, Function>([[id, () => Guard]])]
])
/**
 * @since 1.0.0
 */
export const Schema: S.Schema<bigint> = S.declare(id, Support)

/**
 * @since 1.0.0
 */
export const Guard = G.make(
  Schema,
  (input): input is bigint => typeof input === "bigint"
)
