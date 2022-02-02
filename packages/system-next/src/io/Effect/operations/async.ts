import { Option } from "../../../data/Option"
import { FiberId } from "../../FiberId"
import { Effect } from "../definition"
import type { Cb } from "./Cb"

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `asyncMaybe` for the more expressive variant of this function that can
 * return a value synchronously.
 *
 * The callback function `Effect<R, E, A] => Any` must be called at most once.
 *
 * @tsplus static ets/EffectOps async
 */
export function _async<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => void,
  __etsTrace?: string
): Effect<R, E, A> {
  return asyncBlockingOn(register, FiberId.none)
}

export { _async as async }

/**
 * Imports an asynchronous side-effect into a pure `ZIO` value. See
 * `asyncMaybe` for the more expressive variant of this function that can
 * return a value synchronously.
 *
 * The callback function `ZIO[R, E, A] => Any` must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 *
 * @tsplus static ets/EffectOps asyncBlockingOn
 */
export function asyncBlockingOn<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => void,
  blockingOn: FiberId,
  __etsTrace?: string
): Effect<R, E, A> {
  return Effect.asyncMaybeBlockingOn((cb) => {
    register(cb)
    return Option.none
  }, blockingOn)
}
