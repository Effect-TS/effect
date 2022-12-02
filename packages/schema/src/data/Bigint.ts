/**
 * @since 1.0.0
 */
import * as O from "@fp-ts/data/Option"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/bigint")

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: () => Guard
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<bigint> = I.declareSchema(id, O.none, Provider)

const Guard = I.makeGuard<bigint>(Schema, (u): u is bigint => typeof u === "bigint")
