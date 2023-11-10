/**
 * @since 2.0.0
 */
import type { TRandomTypeId } from "./impl/TRandom.js"
import type { STM } from "./STM.js"
import type { TRef } from "./TRef.js"
import type { Utils } from "./Utils.js"

/**
 * @since 2.0.0
 */
export * from "./impl/TRandom.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/TRandom.js"

/**
 * @since 2.0.0
 */
export declare namespace TRandom {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TRandom.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface TRandom {
  readonly [TRandomTypeId]: TRandomTypeId
  /**
   * Returns the next numeric value from the pseudo-random number generator.
   */
  readonly next: STM<never, never, number>
  /**
   * Returns the next boolean value from the pseudo-random number generator.
   */
  readonly nextBoolean: STM<never, never, boolean>
  /**
   * Returns the next integer value from the pseudo-random number generator.
   */
  readonly nextInt: STM<never, never, number>
  /**
   * Returns the next numeric value in the specified range from the
   * pseudo-random number generator.
   */
  nextRange(min: number, max: number): STM<never, never, number>
  /**
   * Returns the next integer value in the specified range from the
   * pseudo-random number generator.
   */
  nextIntBetween(min: number, max: number): STM<never, never, number>
  /**
   * Uses the pseudo-random number generator to shuffle the specified iterable.
   */
  shuffle<A>(elements: Iterable<A>): STM<never, never, Array<A>>
}
/**
 * @internal
 * @since 2.0.0
 */
export interface TRandom {
  /** @internal */
  readonly state: TRef<Utils.PCGRandomState>
}
