// ets_tracing: off

import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { foldWhileManagedM } from "./foldWhileManagedM.js"

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function fold<S>(s: S) {
  return <O>(f: (s: S, o: O) => S) =>
    <R, E>(self: Stream<R, E, O>) =>
      M.use_(
        foldWhileManagedM(s)((_) => true)((s, a: O) => T.succeed(f(s, a)))(self),
        T.succeed
      )
}
