import * as E from "../Either"
import type { FiberID } from "../Fiber/id"
import type { Canceler } from "./Canceler"
import type { Cb } from "./Cb"
import type { Effect } from "./effect"
import { effectMaybeAsyncInterrupt } from "./effectMaybeAsyncInterrupt"

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
  blockingOn: readonly FiberID[] = []
) {
  return effectMaybeAsyncInterrupt<R, E, A>((cb) => E.left(register(cb)), blockingOn)
}
