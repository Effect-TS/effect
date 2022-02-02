// ets_tracing: off

import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import type * as O from "../../../../Option"
import type * as C from "../core"
import type { Emit } from "./_internal/Emit"
import * as AsyncInterrupt from "./asyncInterrupt"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function asyncMaybe<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => O.Option<C.Stream<R, E, A>>,
  outputBuffer = 16
): C.Stream<R, E, A> {
  return AsyncInterrupt.asyncInterrupt<R, E, A>(
    (k) => E.fromOption_(register(k), () => T.unit),
    outputBuffer
  )
}
