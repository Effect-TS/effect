// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import type * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import type { Emit } from "./_internal/Emit.js"
import * as AsyncInterrupt from "./asyncInterrupt.js"

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
