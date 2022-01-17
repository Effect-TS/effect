import type { Either } from "../../Either"
import type { FiberId } from "../../FiberId"
import { none } from "../../FiberId/operations/none"
import type { Canceler, Effect } from "../definition"
import { IAsync } from "../definition"
import type { Cb } from "./Cb"

/**
 * Imports an asynchronous side-effect into a ZIO effect. The side-effect has
 * the option of returning the value synchronously, which is useful in cases
 * where it cannot be determined if the effect is synchronous or asynchronous
 * until the side-effect is actually executed. The effect also has the option
 * of returning a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 */
export function asyncInterrupt<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => Either<Canceler<R>, Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return new IAsync(register, none, __trace)
}

/**
 * Imports an asynchronous side-effect into a ZIO effect. The side-effect has
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
 */
export function asyncInterruptBlockingOn<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => Either<Canceler<R>, Effect<R, E, A>>,
  blockingOn: FiberId,
  __trace?: string
): Effect<R, E, A> {
  return new IAsync(register, blockingOn, __trace)
}
