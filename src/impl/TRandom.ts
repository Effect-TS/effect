/**
 * @since 2.0.0
 */
import type * as Context from "./Context.js"
import * as internal from "./internal/stm/tRandom.js"
import type * as Layer from "./Layer.js"
import type * as STM from "./STM.js"
import type * as TRef from "./TRef.js"
import type * as Random from "./Utils.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TRandomTypeId: unique symbol = internal.TRandomTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TRandomTypeId = typeof TRandomTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface TRandom {
  readonly [TRandomTypeId]: TRandomTypeId
  /**
   * Returns the next numeric value from the pseudo-random number generator.
   */
  readonly next: STM.STM<never, never, number>
  /**
   * Returns the next boolean value from the pseudo-random number generator.
   */
  readonly nextBoolean: STM.STM<never, never, boolean>
  /**
   * Returns the next integer value from the pseudo-random number generator.
   */
  readonly nextInt: STM.STM<never, never, number>
  /**
   * Returns the next numeric value in the specified range from the
   * pseudo-random number generator.
   */
  nextRange(min: number, max: number): STM.STM<never, never, number>
  /**
   * Returns the next integer value in the specified range from the
   * pseudo-random number generator.
   */
  nextIntBetween(min: number, max: number): STM.STM<never, never, number>
  /**
   * Uses the pseudo-random number generator to shuffle the specified iterable.
   */
  shuffle<A>(elements: Iterable<A>): STM.STM<never, never, Array<A>>
}
/**
 * @internal
 * @since 2.0.0
 */
export interface TRandom {
  /** @internal */
  readonly state: TRef.TRef<Random.PCGRandomState>
}

/**
 * The service tag used to access `TRandom` in the environment of an effect.
 *
 * @since 2.0.0
 * @category context
 */
export const Tag: Context.Tag<TRandom, TRandom> = internal.Tag

/**
 * The "live" `TRandom` service wrapped into a `Layer`.
 *
 * @since 2.0.0
 * @category context
 */
export const live: Layer.Layer<never, never, TRandom> = internal.live

/**
 * Returns the next number from the pseudo-random number generator.
 *
 * @since 2.0.0
 * @category random
 */
export const next: STM.STM<TRandom, never, number> = internal.next

/**
 * Returns the next boolean value from the pseudo-random number generator.
 *
 * @since 2.0.0
 * @category random
 */
export const nextBoolean: STM.STM<TRandom, never, boolean> = internal.nextBoolean

/**
 * Returns the next integer from the pseudo-random number generator.
 *
 * @since 2.0.0
 * @category random
 */
export const nextInt: STM.STM<TRandom, never, number> = internal.nextInt

/**
 * Returns the next integer in the specified range from the pseudo-random number
 * generator.
 *
 * @since 2.0.0
 * @category random
 */
export const nextIntBetween: (low: number, high: number) => STM.STM<TRandom, never, number> = internal.nextIntBetween

/**
 * Returns the next number in the specified range from the pseudo-random number
 * generator.
 *
 * @since 2.0.0
 * @category random
 */
export const nextRange: (min: number, max: number) => STM.STM<TRandom, never, number> = internal.nextRange

/**
 * Uses the pseudo-random number generator to shuffle the specified iterable.
 *
 * @since 2.0.0
 * @category random
 */
export const shuffle: <A>(elements: Iterable<A>) => STM.STM<TRandom, never, Array<A>> = internal.shuffle
