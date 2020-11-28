import type * as A from "../../Array"
import * as E from "../../Either"
import type * as Ex from "../../Exit"
import type * as Option from "../../Option"
import type * as T from "../_internal/effect"
import type * as F from "../_internal/fiber"
import type { Stream } from "./definitions"
import { effectAsyncInterruptEither } from "./effectAsyncInterruptEither"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function effectAsyncInterrupt<R, E, A>(
  register: (
    cb: (
      next: T.Effect<R, Option.Option<E>, A.Array<A>>,
      offerCb?: F.Callback<never, boolean>
    ) => T.UIO<Ex.Exit<never, boolean>>
  ) => T.Canceler<R>,
  outputBuffer = 16
): Stream<R, E, A> {
  return effectAsyncInterruptEither((cb) => E.left(register(cb)), outputBuffer)
}
