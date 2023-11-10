import type * as Either from "../Either.js"
import * as internal from "../internal/stm/tDeferred.js"
import type * as Option from "../Option.js"
import type * as STM from "../STM.js"
import type { TDeferred } from "../TDeferred.js"

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

const _await: <E, A>(self: TDeferred<E, A>) => STM.STM<never, E, A> = internal._await
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
  <E, A>(either: Either.Either<E, A>): (self: TDeferred<E, A>) => STM.STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, either: Either.Either<E, A>): STM.STM<never, never, boolean>
} = internal.done

/**
 * @since 2.0.0
 * @category mutations
 */
export const fail: {
  <E>(error: E): <A>(self: TDeferred<E, A>) => STM.STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, error: E): STM.STM<never, never, boolean>
} = internal.fail

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <E, A>() => STM.STM<never, never, TDeferred<E, A>> = internal.make

/**
 * @since 2.0.0
 * @category getters
 */
export const poll: <E, A>(self: TDeferred<E, A>) => STM.STM<never, never, Option.Option<Either.Either<E, A>>> =
  internal.poll

/**
 * @since 2.0.0
 * @category mutations
 */
export const succeed: {
  <A>(value: A): <E>(self: TDeferred<E, A>) => STM.STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, value: A): STM.STM<never, never, boolean>
} = internal.succeed
