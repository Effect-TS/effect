/**
 * @since 1.0.0
 */
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const ArbitraryAnnotationId = "@fp-ts/schema/annotation/ArbitraryAnnotation"

/**
 * @since 1.0.0
 */
export interface ArbitraryAnnotation {
  readonly handler: (...Arbitrarys: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
}

/**
 * @since 1.0.0
 */
export const arbitraryAnnotation = (
  handler: (...Arbitrarys: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
): ArbitraryAnnotation => ({ handler })

/**
 * @since 1.0.0
 */
export const getArbitraryAnnotation = I.getAnnotation<ArbitraryAnnotation>(ArbitraryAnnotationId)
