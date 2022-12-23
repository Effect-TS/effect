/**
 * @since 1.0.0
 */
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const GuardAnnotationId = "@fp-ts/schema/annotation/GuardAnnotation"

/**
 * @since 1.0.0
 */
export interface GuardAnnotation {
  readonly handler: (...guards: ReadonlyArray<Guard<any>>) => Guard<any>
}

/**
 * @since 1.0.0
 */
export const guardAnnotation = (
  handler: (...guards: ReadonlyArray<Guard<any>>) => Guard<any>
): GuardAnnotation => ({ handler })

/**
 * @since 1.0.0
 */
export const getGuardAnnotation = I.getAnnotation<GuardAnnotation>(GuardAnnotationId)
