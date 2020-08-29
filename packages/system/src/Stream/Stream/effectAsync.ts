import type * as T from "../_internal/effect"
import * as A from "../../Array"
import * as O from "../../Option"
import type { Stream } from "./definitions"
import { effectAsyncMaybe } from "./effectAsyncMaybe"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export const effectAsync = <R, E, A>(
  register: (
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => void,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  effectAsyncMaybe((cb) => {
    register(cb)
    return O.none
  }, outputBuffer)
