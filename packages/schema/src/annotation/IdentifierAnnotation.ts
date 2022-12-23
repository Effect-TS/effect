/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const IdentifierAnnotationId = "@fp-ts/schema/annotation/IdentifierAnnotation"

/**
 * @since 1.0.0
 */
export interface IdentifierAnnotation {
  readonly identifier: string
}

/**
 * @since 1.0.0
 */
export const identifierAnnotation = (
  identifier: string
): IdentifierAnnotation => ({ identifier })

/**
 * @since 1.0.0
 */
export const getIdentifierAnnotation = I.getAnnotation<IdentifierAnnotation>(IdentifierAnnotationId)
