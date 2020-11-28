import type * as Array from "../../Array"
import type { Exit } from "../../Exit"
import type { Callback } from "../../Fiber"
import * as Option from "../../Option"
import type * as T from "../_internal/effect"
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
      next: T.Effect<R, Option.Option<E>, Array.Array<A>>,
      offerCb?: Callback<never, boolean>
    ) => T.UIO<Exit<never, boolean>>
  ) => void,
  outputBuffer = 16
): Stream<R, E, A> {
  return effectAsyncMaybe((cb) => {
    register(cb)
    return Option.none
  }, outputBuffer)
}
