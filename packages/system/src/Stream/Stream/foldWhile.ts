// ets_tracing: off

import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { foldWhileManagedM } from "./foldWhileManagedM.js"

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhile<S>(s: S) {
  return (cont: (s: S) => boolean) =>
    <O>(f: (s: S, o: O) => S) =>
    <R, E>(self: Stream<R, E, O>): T.Effect<R, E, S> =>
      M.use_(
        foldWhileManagedM(s)(cont)((s, a: O) => T.succeed(f(s, a)))(self),
        T.succeed
      )
}
