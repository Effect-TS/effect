// ets_tracing: off

import { identity, pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import { catchAll_ } from "./catchAll.js"
import { die } from "./die.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first refineOrDieWith_
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>) => refineOrDieWith_(self, pf, f, __trace)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return catchAll_(
    self,
    (e) =>
      pipe(
        e,
        pf,
        O.fold(
          () => die(f(e)),
          (e1) => fail(e1)
        )
      ),
    __trace
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>, __trace?: string) {
  return <R, A>(self: Effect<R, E, A>) => refineOrDie_(self, pf, __trace)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  __trace?: string
) {
  return refineOrDieWith_(self, pf, identity, __trace)
}
