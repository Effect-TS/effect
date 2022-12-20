/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export const DocumentationAnnotationId = "@fp-ts/schema/annotation/DocumentationAnnotation"

/**
 * @since 1.0.0
 */
export interface DocumentationAnnotation {
  readonly _id: typeof DocumentationAnnotationId
  readonly documentation: string
}

/**
 * @since 1.0.0
 */
export const isDocumentationAnnotation = (u: unknown): u is DocumentationAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === DocumentationAnnotationId

/**
 * @since 1.0.0
 */
export const documentationAnnotation = (
  documentation: string
): DocumentationAnnotation => ({ _id: DocumentationAnnotationId, documentation })
