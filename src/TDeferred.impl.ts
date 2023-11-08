/**
 * @since 2.0.0
 */
import type { Either } from "./Either.js"
import * as internal from "./internal/stm/tDeferred.js"
import type { Option } from "./Option.js"
import type { STM } from "./STM.js"
import type { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TDeferredTypeId: unique symbol = internal.TDeferredTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TDeferredTypeId = typeof TDeferredTypeId

export declare namespace TDeferred {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./TDeferred.impl.js"
}
  /**
   * @since 2.0.0
   * @category models
   */
  export interface TDeferred<E, A> extends TDeferred.Variance<E, A> {}
  /**
   * @internal
   * @since 2.0.0
   */
  export interface TDeferred<E, A> {
    /** @internal */
    readonly ref: TRef<Option<Either<E, A>>>
  }

  /**
   * @since 2.0.0
   */
  export namespace TDeferred {
    /**
     * @since 2.0.0
     * @category models
     */
    export interface Variance<E, A> {
      readonly [TDeferredTypeId]: {
        readonly _E: (_: never) => E
        readonly _A: (_: never) => A
      }
    }
  }
}

const _await: <E, A>(self: TDeferred<E, A>) => STM<never, E, A> = internal._await
export {
  /**
   * @since 2.0.0
   * @category getters
   */
  _await as await
}

/**
 * @since 2.0.0
 * @category mutations
 */
export const done: {
  <E, A>(either: Either<E, A>): (self: TDeferred<E, A>) => STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, either: Either<E, A>): STM<never, never, boolean>
} = internal.done

/**
 * @since 2.0.0
 * @category mutations
 */
export const fail: {
  <E>(error: E): <A>(self: TDeferred<E, A>) => STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, error: E): STM<never, never, boolean>
} = internal.fail

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <E, A>() => STM<never, never, TDeferred<E, A>> = internal.make

/**
 * @since 2.0.0
 * @category getters
 */
export const poll: <E, A>(self: TDeferred<E, A>) => STM<never, never, Option<Either<E, A>>> = internal.poll

/**
 * @since 2.0.0
 * @category mutations
 */
export const succeed: {
  <A>(value: A): <E>(self: TDeferred<E, A>) => STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, value: A): STM<never, never, boolean>
} = internal.succeed
