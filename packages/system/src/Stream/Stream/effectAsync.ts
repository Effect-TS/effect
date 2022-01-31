// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as Ex from "../../Exit/index.js"
import * as O from "../../Option/index.js"
import type * as T from "../_internal/effect.js"
import type * as F from "../_internal/fiber.js"
import type { Stream } from "./definitions.js"
import { effectAsyncMaybe } from "./effectAsyncMaybe.js"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function effectAsync<R, E, A>(
  register: (
    cb: (
      next: T.Effect<R, O.Option<E>, A.Chunk<A>>,
      offerCb?: F.Callback<never, boolean>
    ) => T.UIO<Ex.Exit<never, boolean>>
  ) => void,
  outputBuffer = 16
): Stream<R, E, A> {
  return effectAsyncMaybe((cb) => {
    register(cb)
    return O.none
  }, outputBuffer)
}
