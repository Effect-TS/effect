// ets_tracing: off

import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import type { Emit } from "./_internal/Emit.js"
import * as AsyncMaybe from "./asyncMaybe.js"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function async<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => void,
  outputBuffer = 16
): C.Stream<R, E, A> {
  return AsyncMaybe.asyncMaybe<R, E, A>((callback) => {
    register(callback)
    return O.none
  }, outputBuffer)
}
