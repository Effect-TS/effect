// ets_tracing: off

import * as E from "../Either/index.js"
import { NoSuchElementException } from "../GlobalExceptions/index.js"
import * as O from "../Option/index.js"
import { chain_, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail, failWith } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 */
export function leftOrFail_<R, E, B, C, E1>(
  self: Effect<R, E, E.Either<B, C>>,
  orFail: (c: C) => E1,
  __trace?: string
) {
  return chain_(
    self,
    E.fold(succeed, (x) => failWith(() => orFail(x))),
    __trace
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @ets_data_first leftOrFail_
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1, __trace?: string) {
  return <R, E, B>(self: Effect<R, E, E.Either<B, C>>) =>
    leftOrFail_(self, orFail, __trace)
}

/**
 * Returns a successful effect if the value is `Left`, or fails with a `NoSuchElementException`.
 */
export function leftOrFailException<R, E, B, C>(
  self: Effect<R, E, E.Either<B, C>>,
  __trace?: string
) {
  return leftOrFail_(self, () => new NoSuchElementException(), __trace)
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error `None`.
 */
export function left<R, E, B, C>(
  self: Effect<R, E, E.Either<B, C>>
): Effect<R, O.Option<E>, B> {
  return foldM_(
    self,
    (e) => fail(O.some(e)),
    E.fold(succeed, () => fail(O.none))
  )
}
