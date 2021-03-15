// tracing: off

import * as E from "../Either"
import { NoSuchElementException } from "../GlobalExceptions"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { failWith } from "./fail"

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
 * @dataFirst leftOrFail_
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
