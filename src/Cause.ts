/**
 * @since 2.0.0
 */
import type { CauseTypeId, Die, Empty, Fail, Interrupt, Parallel, Sequential } from "./impl/Cause.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Cause.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Cause.js"

/**
 * A `Cause` represents the full history of a failure resulting from running an
 * `Effect` workflow.
 *
 * Effect-TS uses a data structure from functional programming called a semiring
 * to represent the `Cause` data type. This allows us to take a base type `E`
 * (which represents the error type of an `Effect`) and capture the sequential
 * and parallel composition of errors in a fully lossless fashion.
 *
 * @since 2.0.0
 * @category models
 */
export type Cause<E> =
  | Empty
  | Fail<E>
  | Die
  | Interrupt
  | Sequential<E>
  | Parallel<E>

/**
 * @since 2.0.0
 */
export declare namespace Cause {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E> {
    readonly [CauseTypeId]: {
      readonly _E: (_: never) => E
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Cause.js"
}
