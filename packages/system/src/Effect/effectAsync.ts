// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import type { FiberID } from "../Fiber/id"
import * as O from "../Option"
import type { Cb } from "./Cb"
import { effectAsyncOptionBlockingOn } from "./core"
import type { Effect } from "./effect"

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
    traceAs(register, (cb) => {
      register(cb)
      return O.none
    }),
    blockingOn,
    __trace
  )
}
