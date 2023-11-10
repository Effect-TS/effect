/**
 * The `Effect<R, E, A>` type is polymorphic in values of type `E` and we can
 * work with any error type that we want. However, there is a lot of information
 * that is not inside an arbitrary `E` value. So as a result, an `Effect` needs
 * somewhere to store things like unexpected errors or defects, stack and
 * execution traces, causes of fiber interruptions, and so forth.
 *
 * Effect-TS is very strict about preserving the full information related to a
 * failure. It captures all type of errors into the `Cause` data type. `Effect`
 * uses the `Cause<E>` data type to store the full story of failure. So its
 * error model is lossless. It doesn't throw information related to the failure
 * result. So we can figure out exactly what happened during the operation of
 * our effects.
 *
 * It is important to note that `Cause` is an underlying data type representing
 * errors occuring within an `Effect` workflow. Thus, we don't usually deal with
 * `Cause`s directly. Even though it is not a data type that we deal with very
 * often, the `Cause` of a failing `Effect` workflow can be accessed at any
 * time, which gives us total access to all parallel and sequential errors in
 * occurring within our codebase.
 *
 * @since 2.0.0
 */
import type { CauseTypeId, Die, Empty, Fail, Interrupt, Parallel, Sequential } from "./impl/Cause.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Cause.js"
/**
 * @since 2.0.0
 * @internal
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
