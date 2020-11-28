import * as T from "../../Effect"
import * as M from "../../Managed"
import type { Stream } from "./definitions"
import { foldWhileManagedM } from "./foldWhileManagedM"

/**
 * Executes an effectful fold over the stream of values.
 */
export function foldM<S>(s: S) {
  return <O, R1, E1>(f: (s: S, o: O) => T.Effect<R1, E1, S>) => <R, E>(
    self: Stream<R, E, O>
  ): T.Effect<R & R1, E1 | E, S> =>
    M.use_(foldWhileManagedM(s)((_) => true)(f)(self), T.succeed)
}
