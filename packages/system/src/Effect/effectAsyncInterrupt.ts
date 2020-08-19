import * as E from "../Either"
import { FiberID } from "../Fiber/id"

import { Canceler } from "./Canceler"
import { Cb } from "./Cb"
import { AsyncRE } from "./effect"
import { effectMaybeAsyncInterrupt } from "./effectMaybeAsyncInterrupt"

/**
 * Imports an asynchronous side-effect into an effect. The effect also
 * returns a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export const effectAsyncInterrupt = <R, E, A>(
  register: (cb: Cb<AsyncRE<R, E, A>>) => Canceler<R>,
  blockingOn: readonly FiberID[] = []
) => effectMaybeAsyncInterrupt<R, E, A>((cb) => E.left(register(cb)), blockingOn)
