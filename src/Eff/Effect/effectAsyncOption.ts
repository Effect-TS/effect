import * as O from "../../Option"
import { FiberID } from "../Fiber/id"

import { AsyncRE } from "./effect"
import { IEffectAsync } from "./primitives"

/**
 * Imports an asynchronous effect into a pure `Effect` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `AsyncRE<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export const effectAsyncOption = <R, E, A>(
  register: (cb: (_: AsyncRE<R, E, A>) => void) => O.Option<AsyncRE<R, E, A>>,
  blockingOn: readonly FiberID[] = []
): AsyncRE<R, E, A> => new IEffectAsync(register, blockingOn)
