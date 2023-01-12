/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export interface Hook<A> {
  readonly handler: (...typeParameters: ReadonlyArray<A>) => A
}

/**
 * @since 1.0.0
 */
export const hook = (
  handler: (...typeParameters: ReadonlyArray<any>) => any
): Hook<any> => ({ handler })

/**
 * @since 1.0.0
 */
export const ArbitraryHookId = "@fp-ts/schema/annotation/ArbitraryHookId"

/**
 * @since 1.0.0
 */
export const ParserHookId = "@fp-ts/schema/annotation/ParserHookId"

/**
 * @since 1.0.0
 */
export const PrettyHookId = "@fp-ts/schema/annotation/PrettyHookId"
