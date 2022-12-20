/**
 * @since 1.0.0
 */
import type { Guard } from "@fp-ts/schema/Guard"

/**
 * @since 1.0.0
 */
export const GuardAnnotationId = "@fp-ts/schema/annotation/GuardAnnotation"

/**
 * @since 1.0.0
 */
export interface GuardAnnotation {
  readonly _id: typeof GuardAnnotationId
  readonly handler: (...guards: ReadonlyArray<Guard<any>>) => Guard<any>
}

/**
 * @since 1.0.0
 */
export const isGuardAnnotation = (u: unknown): u is GuardAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === GuardAnnotationId

/**
 * @since 1.0.0
 */
export const guardAnnotation = (
  handler: (...guards: ReadonlyArray<Guard<any>>) => Guard<any>
): GuardAnnotation => ({ _id: GuardAnnotationId, handler })
