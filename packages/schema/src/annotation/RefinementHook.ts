/**
 * @since 1.0.0
 */
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export interface RefinementHook<A> {
  readonly handler: (from: A) => A
}

/**
 * @since 1.0.0
 */
export const refinementHook = <A>(
  handler: (from: A) => A
): RefinementHook<A> => ({ handler })

/**
 * @since 1.0.0
 */
export const getRefinementHook = I.getAnnotation

/**
 * @since 1.0.0
 */
export const ArbitraryRefinementHookId = "@fp-ts/schema/annotation/ArbitraryRefinementHookId"
