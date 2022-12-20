/**
 * @since 1.0.0
 */
import type { Pretty } from "@fp-ts/schema/Pretty"

/**
 * @since 1.0.0
 */
export const PrettyAnnotationId = "@fp-ts/schema/annotation/PrettyAnnotation"

/**
 * @since 1.0.0
 */
export interface PrettyAnnotation {
  readonly _id: typeof PrettyAnnotationId
  readonly handler: (...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
}

/**
 * @since 1.0.0
 */
export const isPrettyAnnotation = (u: unknown): u is PrettyAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === PrettyAnnotationId

/**
 * @since 1.0.0
 */
export const prettyAnnotation = (
  handler: (...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
): PrettyAnnotation => ({ _id: PrettyAnnotationId, handler })
