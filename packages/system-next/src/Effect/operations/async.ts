import type { FiberId } from "../../FiberId"
import { none } from "../../FiberId/operations/none"
import * as O from "../../Option"
import type { Effect } from "../definition"
import { asyncMaybeBlockingOn } from "./asyncMaybe"
import type { Cb } from "./Cb"

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `asyncMaybe` for the more expressive variant of this function that can
 * return a value synchronously.
 *
 * The callback function `Effect<R, E, A] => Any` must be called at most once.
 */
function _async<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => void,
  __trace?: string
): Effect<R, E, A> {
  return asyncBlockingOn(register, none, __trace)
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
 */
export function asyncBlockingOn<R, E, A>(
  register: (callback: Cb<Effect<R, E, A>>) => void,
  blockingOn: FiberId,
  __trace?: string
): Effect<R, E, A> {
  return asyncMaybeBlockingOn(
    (cb) => {
      register(cb)
      return O.none
    },
    blockingOn,
    __trace
  )
}
