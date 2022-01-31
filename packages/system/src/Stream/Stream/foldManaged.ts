// ets_tracing: off

import * as T from "../_internal/effect.js"
import type * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { foldWhileManagedM } from "./foldWhileManagedM.js"

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManaged<S>(s: S) {
  return <O>(f: (s: S, o: O) => S) =>
    <R, E>(self: Stream<R, E, O>): M.Managed<R, E, S> =>
      foldWhileManagedM(s)((_) => true)((s, a: O) => T.succeed(f(s, a)))(self)
}
