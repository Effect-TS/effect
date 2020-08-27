import { pipe } from "../Function"
import * as O from "../Option"
import type { Effect } from "."
import { catchAll_ } from "./catchAll_"
import { die } from "./die"
import { fail } from "./fail"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(pf: (e: E) => O.Option<E1>) {
  return (f: (e: E) => unknown) => <S, R, A>(self: Effect<S, R, E, A>) =>
    catchAll_(self, (e) =>
      pipe(
        e,
        pf,
        O.fold(
          () => die(f(e)),
          (e1) => fail(e1)
        )
      )
    )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>) {
  return <S, R, A>(self: Effect<S, R, E, A>) =>
    catchAll_(self, (e) =>
      pipe(
        e,
        pf,
        O.fold(
          () => die(e),
          (e1) => fail(e1)
        )
      )
    )
}
