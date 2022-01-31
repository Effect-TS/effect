// ets_tracing: off

import * as O from "../../Option/index.js"
import { catchAll_ } from "./catchAll.js"
import type { Stream } from "./definitions.js"
import { die } from "./die.js"
import { fail } from "./fail.js"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(pf: (e: E) => O.Option<E1>) {
  return (f: (e: E) => unknown) =>
    <R, O>(self: Stream<R, E, O>): Stream<R, E1, O> =>
      catchAll_(self, (err) =>
        O.fold_(
          pf(err),
          () => die(f(err)),
          (_) => fail(_)
        )
      )
}
