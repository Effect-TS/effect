/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"

/**
 * @since 1.0.0
 */
export const PrettyAnnotationId = "@fp-ts/schema/annotation/PrettyAnnotation"

/**
 * @since 1.0.0
 */
export interface PrettyAnnotation {
  readonly handler: (...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
}

/**
 * @since 1.0.0
 */
export const prettyAnnotation = (
  handler: (...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
): PrettyAnnotation => ({ handler })

/**
 * @since 1.0.0
 */
export const getPrettyAnnotation = I.getAnnotation<PrettyAnnotation>(PrettyAnnotationId)
