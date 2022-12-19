/**
 * @since 1.0.0
 */
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export interface GuardAnnotation {
  readonly _id: typeof I.GuardId
  readonly config: unknown
  readonly handler: (config: unknown, ...guards: ReadonlyArray<Guard<any>>) => Guard<any>
}

/**
 * @since 1.0.0
 */
export const isGuardAnnotation = (u: unknown): u is GuardAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === I.GuardId

/**
 * @since 1.0.0
 */
export const guardAnnotation = (
  config: unknown,
  handler: (config: unknown, ...guards: ReadonlyArray<Guard<any>>) => Guard<any>
): GuardAnnotation => ({
  _id: I.GuardId,
  config,
  handler
})
