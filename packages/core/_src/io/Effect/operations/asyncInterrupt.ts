import { IAsync } from "@effect/core/io/Effect/definition/primitives"

/**
 * Imports an asynchronous side-effect into an effect. The side-effect has
 * the option of returning the value synchronously, which is useful in cases
 * where it cannot be determined if the effect is synchronous or asynchronous
 * until the side-effect is actually executed. The effect also has the option
 * of returning a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncInterrupt
 */
export function asyncInterrupt<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Either<Effect<R, never, void>, Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(new IAsync(register, () => FiberId.none, __tsplusTrace))
}

/**
 * Imports an asynchronous side-effect into an effect. The side-effect has
 * the option of returning the value synchronously, which is useful in cases
 * where it cannot be determined if the effect is synchronous or asynchronous
 * until the side-effect is actually executed. The effect also has the option
 * of returning a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncInterruptBlockingOn
 */
export function asyncInterruptBlockingOn<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Either<Effect<R, never, void>, Effect<R, E, A>>,
  blockingOn: LazyArg<FiberId>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(new IAsync(register, blockingOn, __tsplusTrace))
}
