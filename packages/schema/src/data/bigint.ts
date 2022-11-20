/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type * as S from "@fp-ts/codec/Schema"
import type * as Sh from "@fp-ts/codec/Show"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/bigint")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<bigint> = I.declareSchema(id, O.none, Provider)

/**
 * @since 1.0.0
 */
export const Guard = I.makeGuard(
  Schema,
  (input): input is bigint => typeof input === "bigint"
)

/**
 * @since 1.0.0
 */
export const Show: Sh.Show<bigint> = I.makeShow(
  Schema,
  (bigint) => bigint.toString()
)
