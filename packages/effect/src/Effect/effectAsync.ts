// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import type { FiberID } from "../Fiber/id"
import * as O from "../Option"
import type { Cb } from "./Cb"
import { effectAsyncOption } from "./core"
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
 *
 * @trace 0
 */
export function effectAsync<R, E, A>(
  register: (cb: Cb<Effect<R, E, A>>) => void,
  blockingOn: readonly FiberID[] = []
): Effect<R, E, A> {
  return effectAsyncOption(
    traceAs(register, (cb) => {
      register(cb)
      return O.none
    }),
    blockingOn
  )
}
