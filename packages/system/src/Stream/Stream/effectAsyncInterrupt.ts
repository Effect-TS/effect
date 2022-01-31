// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as E from "../../Either/index.js"
import type * as Ex from "../../Exit/index.js"
import type * as Option from "../../Option/index.js"
import type * as T from "../_internal/effect.js"
import type * as F from "../_internal/fiber.js"
import type { Stream } from "./definitions.js"
import { effectAsyncInterruptEither } from "./effectAsyncInterruptEither.js"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function effectAsyncInterrupt<R, E, A>(
  register: (
    cb: (
      next: T.Effect<R, Option.Option<E>, A.Chunk<A>>,
      offerCb?: F.Callback<never, boolean>
    ) => T.UIO<Ex.Exit<never, boolean>>
  ) => T.Canceler<R>,
  outputBuffer = 16
): Stream<R, E, A> {
  return effectAsyncInterruptEither((cb) => E.left(register(cb)), outputBuffer)
}
