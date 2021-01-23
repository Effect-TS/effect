import type * as A from "../../Chunk"
import type * as Ex from "../../Exit"
import * as O from "../../Option"
import type * as T from "../_internal/effect"
import type * as F from "../_internal/fiber"
import type { Stream } from "./definitions"
import { effectAsyncMaybe } from "./effectAsyncMaybe"

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
