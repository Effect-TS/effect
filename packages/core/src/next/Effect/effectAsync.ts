import * as O from "../../Option"
import { FiberID } from "../Fiber/id"

import { Cb } from "./Cb"
import { AsyncRE } from "./effect"
import { IEffectAsync } from "./primitives"

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
export const effectAsync = <R, E, A>(
  register: (cb: Cb<AsyncRE<R, E, A>>) => void,
  blockingOn: readonly FiberID[] = []
): AsyncRE<R, E, A> =>
  new IEffectAsync((cb) => {
    register(cb)
    return O.none
  }, blockingOn)
