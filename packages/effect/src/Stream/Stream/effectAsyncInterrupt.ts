import type * as T from "../_internal/effect"
import type * as Array from "../../Array"
import * as Either from "../../Either"
import type { Exit } from "../../Exit"
import type { Callback } from "../../Fiber"
import type * as Option from "../../Option"
import type { Stream } from "./definitions"
import { effectAsyncInterruptEither } from "./effectAsyncInterruptEither"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export const effectAsyncInterrupt = <R, E, A>(
  register: (
    cb: (
      next: T.Effect<unknown, R, Option.Option<E>, Array.Array<A>>,
      offerCb?: Callback<never, boolean>
    ) => T.Async<Exit<never, boolean>>
  ) => T.Canceler<R>,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  effectAsyncInterruptEither((cb) => Either.left(register(cb)), outputBuffer)
