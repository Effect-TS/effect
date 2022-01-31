// ets_tracing: off

import type { FiberID } from "../Fiber/id.js"
import * as O from "../Option/index.js"
import type { Cb } from "./Cb.js"
import { effectAsyncOptionBlockingOn } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `effectAsyncOption` for the more expressive variant of this function that
 * can return a value synchronously.
 *
 * The callback function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export function effectAsync<R, E, A>(
  register: (cb: Cb<Effect<R, E, A>>) => void,
  __trace?: string
): Effect<R, E, A> {
  return effectAsyncBlockingOn(register, [], __trace)
}

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `effectAsyncOption` for the more expressive variant of this function that
 * can return a value synchronously.
 *
 * The callback function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export function effectAsyncBlockingOn<R, E, A>(
  register: (cb: Cb<Effect<R, E, A>>) => void,
  blockingOn: readonly FiberID[],
  __trace?: string
): Effect<R, E, A> {
  return effectAsyncOptionBlockingOn(
    (cb) => {
      register(cb)
      return O.none
    },
    blockingOn,
    __trace
  )
}
