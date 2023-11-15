/**
 * @since 2.0.0
 */
import type * as Chunk from "./Chunk.js"
import type * as Effect from "./Effect.js"
import * as defaultServices from "./internal/defaultServices.js"
import * as internal from "./internal/random.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const RandomTypeId: unique symbol = internal.RandomTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type RandomTypeId = typeof RandomTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Random {
  readonly [RandomTypeId]: RandomTypeId
  /**
   * Returns the next numeric value from the pseudo-random number generator.
   */
  readonly next: Effect.Effect<never, never, number>
  /**
   * Returns the next boolean value from the pseudo-random number generator.
   */
  readonly nextBoolean: Effect.Effect<never, never, boolean>
  /**
   * Returns the next integer value from the pseudo-random number generator.
   */
  readonly nextInt: Effect.Effect<never, never, number>
  /**
   * Returns the next numeric value in the specified range from the
   * pseudo-random number generator.
   */
  nextRange(min: number, max: number): Effect.Effect<never, never, number>
  /**
   * Returns the next integer value in the specified range from the
   * pseudo-random number generator.
   */
  nextIntBetween(min: number, max: number): Effect.Effect<never, never, number>
  /**
   * Uses the pseudo-random number generator to shuffle the specified iterable.
   */
  shuffle<A>(elements: Iterable<A>): Effect.Effect<never, never, Chunk.Chunk<A>>
}

/**
 * Returns the next numeric value from the pseudo-random number generator.
 *
 * @since 2.0.0
 * @category constructors
 */
export const next: Effect.Effect<never, never, number> = defaultServices.next

/**
 * Returns the next integer value from the pseudo-random number generator.
 *
 * @since 2.0.0
 * @category constructors
 */
export const nextInt: Effect.Effect<never, never, number> = defaultServices.nextInt

/**
 * Returns the next boolean value from the pseudo-random number generator.
 *
 * @since 2.0.0
 * @category constructors
 */
export const nextBoolean: Effect.Effect<never, never, boolean> = defaultServices.nextBoolean

/**
 * Returns the next numeric value in the specified range from the
 * pseudo-random number generator.
 *
 * @since 2.0.0
 * @category constructors
 */
export const nextRange: (min: number, max: number) => Effect.Effect<never, never, number> = defaultServices.nextRange

/**
 * Returns the next integer value in the specified range from the
 * pseudo-random number generator.
 *
 * @since 2.0.0
 * @category constructors
 */
export const nextIntBetween: (min: number, max: number) => Effect.Effect<never, never, number> =
  defaultServices.nextIntBetween

/**
 * Uses the pseudo-random number generator to shuffle the specified iterable.
 *
 * @since 2.0.0
 * @category constructors
 */
export const shuffle: <A>(elements: Iterable<A>) => Effect.Effect<never, never, Chunk.Chunk<A>> =
  defaultServices.shuffle

/**
 * Retreives the `Random` service from the context and uses it to run the
 * specified workflow.
 *
 * @since 2.0.0
 * @category constructors
 */
export const randomWith: <R, E, A>(f: (random: Random) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  defaultServices.randomWith
