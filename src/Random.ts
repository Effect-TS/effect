import type { Chunk } from "./Chunk.js"
import type { Effect } from "./Effect.js"
import type { RandomTypeId } from "./impl/Random.js"

export * from "./impl/Random.js"
export * from "./internal/Jumpers/Random.js"

export declare namespace Random {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Random.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Random {
  readonly [RandomTypeId]: RandomTypeId
  /**
   * Returns the next numeric value from the pseudo-random number generator.
   */
  next(): Effect<never, never, number>
  /**
   * Returns the next boolean value from the pseudo-random number generator.
   */
  nextBoolean(): Effect<never, never, boolean>
  /**
   * Returns the next integer value from the pseudo-random number generator.
   */
  nextInt(): Effect<never, never, number>
  /**
   * Returns the next numeric value in the specified range from the
   * pseudo-random number generator.
   */
  nextRange(min: number, max: number): Effect<never, never, number>
  /**
   * Returns the next integer value in the specified range from the
   * pseudo-random number generator.
   */
  nextIntBetween(min: number, max: number): Effect<never, never, number>
  /**
   * Uses the pseudo-random number generator to shuffle the specified iterable.
   */
  shuffle<A>(elements: Iterable<A>): Effect<never, never, Chunk<A>>
}
