/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export const IdentifierAnnotationId = "@fp-ts/schema/annotation/IdentifierAnnotation"

/**
 * @since 1.0.0
 */
export interface IdentifierAnnotation {
  readonly _id: typeof IdentifierAnnotationId
  readonly identifier: string
}

/**
 * @since 1.0.0
 */
export const isIdentifierAnnotation = (u: unknown): u is IdentifierAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === IdentifierAnnotationId

/**
 * @since 1.0.0
 */
export const identifierAnnotation = (
  identifier: string
): IdentifierAnnotation => ({ _id: IdentifierAnnotationId, identifier })
