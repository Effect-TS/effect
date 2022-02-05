// ets_tracing: off

import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { foldWhileManagedM } from "./foldWhileManagedM.js"

/**
 * Executes an effectful fold over the stream of values.
 */
export function foldM<S>(s: S) {
  return <O, R1, E1>(f: (s: S, o: O) => T.Effect<R1, E1, S>) =>
    <R, E>(self: Stream<R, E, O>): T.Effect<R & R1, E1 | E, S> =>
      M.use_(foldWhileManagedM(s)((_) => true)(f)(self), T.succeed)
}
