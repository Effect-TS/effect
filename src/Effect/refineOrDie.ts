import { identity, pipe } from "../Function"
import * as O from "../Option"
import type { Effect } from "."
import { catchAll_ } from "./catchAll"
import { die } from "./die"
import { fail } from "./fail"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
) {
  return <R, A>(self: Effect<R, E, A>) => refineOrDieWith_(self, pf, f)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
) {
  return catchAll_(self, (e) =>
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
  return refineOrDieWith(pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => O.Option<E1>
) {
  return refineOrDie(pf)(self)
}
