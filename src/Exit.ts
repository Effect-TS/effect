/**
 * @since 2.0.0
 */
import type { Failure, Success } from "./impl/Exit.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Exit.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Exit.js"

/**
 * @since 2.0.0
 */
export declare namespace Exit {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Exit.js"
}
/**
 * An `Exit<E, A>` describes the result of a executing an `Effect` workflow.
 *
 * There are two possible values for an `Exit<E, A>`:
 *   - `Exit.Success` contain a success value of type `A`
 *   - `Exit.Failure` contains a failure `Cause` of type `E`
 *
 * @since 2.0.0
 * @category models
 */
export type Exit<E, A> = Failure<E, A> | Success<E, A>
