/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const DocumentationAnnotationId = "@fp-ts/schema/annotation/DocumentationAnnotation"

/**
 * @since 1.0.0
 */
export interface DocumentationAnnotation {
  readonly documentation: string
}

/**
 * @since 1.0.0
 */
export const documentationAnnotation = (
  documentation: string
): DocumentationAnnotation => ({ documentation })

/**
 * @since 1.0.0
 */
export const getDocumentationAnnotation = I.getAnnotation<DocumentationAnnotation>(
  DocumentationAnnotationId
)
