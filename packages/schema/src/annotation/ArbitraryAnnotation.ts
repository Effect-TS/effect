/**
 * @since 1.0.0
 */
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"

/**
 * @since 1.0.0
 */
export const ArbitraryAnnotationId = "@fp-ts/schema/annotation/ArbitraryAnnotation"

/**
 * @since 1.0.0
 */
export interface ArbitraryAnnotation {
  readonly _id: typeof ArbitraryAnnotationId
  readonly handler: (...Arbitrarys: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
}

/**
 * @since 1.0.0
 */
export const isArbitraryAnnotation = (u: unknown): u is ArbitraryAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === ArbitraryAnnotationId

/**
 * @since 1.0.0
 */
export const arbitraryAnnotation = (
  handler: (...Arbitrarys: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
): ArbitraryAnnotation => ({ _id: ArbitraryAnnotationId, handler })
