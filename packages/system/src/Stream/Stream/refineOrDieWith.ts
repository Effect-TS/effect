import * as O from "../../Option"
import { catchAll_ } from "./catchAll"
import type { Stream } from "./definitions"
import { die } from "./die"
import { fail } from "./fail"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(pf: (e: E) => O.Option<E1>) {
  return (f: (e: E) => unknown) => <R, O>(self: Stream<R, E, O>): Stream<R, E1, O> =>
    catchAll_(self, (err) =>
      O.fold_(
        pf(err),
        () => die(f(err)),
        (_) => fail(_)
      )
    )
}
