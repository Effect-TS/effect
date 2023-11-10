/**
 * @since 2.0.0
 */
import type { Data } from "./Data.js"
import type { Exit } from "./Exit.js"
import type { RequestTypeId } from "./impl/Request.js"
import type { Option } from "./Option.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Request.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Request.js"

/**
 * A `Request<E, A>` is a request from a data source for a value of type `A`
 * that may fail with an `E`.
 *
 * @since 2.0.0
 * @category models
 */
export interface Request<E, A> extends Request.Variance<E, A>, Data.Case {}

/**
 * @since 2.0.0
 */
export declare namespace Request {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [RequestTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Constructor<R extends Request<any, any>, T extends keyof R = never> {
    (args: Omit<R, T | keyof (Data.Case & Request.Variance<Request.Error<R>, Request.Success<R>>)>): R
  }

  /**
   * A utility type to extract the error type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Error<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _E : never

  /**
   * A utility type to extract the value type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Success<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _A : never

  /**
   * A utility type to extract the result type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Result<T extends Request<any, any>> = T extends Request<infer E, infer A> ? Exit<E, A> : never

  /**
   * A utility type to extract the optional result type from a `Request`.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type OptionalResult<T extends Request<any, any>> = T extends Request<infer E, infer A> ? Exit<E, Option<A>>
    : never
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Request.js"
}
