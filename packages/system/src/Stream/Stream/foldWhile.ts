import * as T from "../../Effect"
import * as M from "../../Managed"
import type { Stream } from "./definitions"
import { foldWhileManagedM } from "./foldWhileManagedM"

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhile<S>(s: S) {
  return (cont: (s: S) => boolean) => <O>(f: (s: S, o: O) => S) => <R, E>(
    self: Stream<R, E, O>
  ): T.Effect<R, E, S> =>
    M.use_(foldWhileManagedM(s)(cont)((s, a: O) => T.succeed(f(s, a)))(self), T.succeed)
}
