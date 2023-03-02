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
export const ArbitraryHookId = "@effect/schema/annotation/ArbitraryHookId"

/**
 * @since 1.0.0
 */
export const ParserHookId = "@effect/schema/annotation/ParserHookId"

/**
 * @since 1.0.0
 */
export const PrettyHookId = "@effect/schema/annotation/PrettyHookId"
