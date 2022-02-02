// ets_tracing: off

import * as E from "../Either"
import type { FiberID } from "../Fiber/id"
import type { Canceler } from "./Canceler"
import type { Cb } from "./Cb"
import type { Effect } from "./effect"
import { effectMaybeAsyncInterruptBlockingOn } from "./effectMaybeAsyncInterrupt"

/**
 * Imports an asynchronous side-effect into an effect. The effect also
 * returns a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export function effectAsyncInterrupt<R, E, A>(
  register: (cb: Cb<Effect<R, E, A>>) => Canceler<R>,
  __trace?: string
) {
  return effectAsyncInterruptBlockingOn<R, E, A>(register, [], __trace)
}

/**
 * Imports an asynchronous side-effect into an effect. The effect also
 * returns a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export function effectAsyncInterruptBlockingOn<R, E, A>(
  register: (cb: Cb<Effect<R, E, A>>) => Canceler<R>,
  blockingOn: readonly FiberID[],
  __trace?: string
) {
  return effectMaybeAsyncInterruptBlockingOn<R, E, A>(
    (cb) => E.left(register(cb)),
    blockingOn,
    __trace
  )
}
