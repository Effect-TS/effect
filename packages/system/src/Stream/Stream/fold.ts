import * as T from "../../Effect"
import * as M from "../../Managed"
import type { Stream } from "./definitions"
import { foldWhileManagedM } from "./foldWhileManagedM"

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function fold<S>(s: S) {
  return <O>(f: (s: S, o: O) => S) => <R, E>(self: Stream<R, E, O>) =>
    M.use_(
      foldWhileManagedM(s)((_) => true)((s, a: O) => T.succeed(f(s, a)))(self),
      T.succeed
    )
}
