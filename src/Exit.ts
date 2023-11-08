import type { Failure, Success } from "./Exit.impl.js"

export * from "./Exit.impl.js"
export * from "./internal/Jumpers/Exit.js"

export declare namespace Exit {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Exit.impl.js"
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
