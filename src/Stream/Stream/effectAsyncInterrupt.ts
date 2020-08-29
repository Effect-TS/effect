import type * as T from "../_internal/effect"
import * as A from "../../Array"
import * as E from "../../Either"
import type * as O from "../../Option"
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
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => T.Canceler<R>,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  effectAsyncInterruptEither((cb) => E.left(register(cb)), outputBuffer)
