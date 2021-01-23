import * as E from "../Either"
import { flow } from "../Function"
import { NoSuchElementException } from "../GlobalExceptions"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 */
export function leftOrFail_<R, E, B, C, E1>(
  self: Effect<R, E, E.Either<B, C>>,
  orFail: (c: C) => E1
) {
  return chain_(self, E.fold(succeed, flow(orFail, fail)))
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1) {
  return <R, E, B>(self: Effect<R, E, E.Either<B, C>>) => leftOrFail_(self, orFail)
}

/**
 * Returns a successful effect if the value is `Left`, or fails with a `NoSuchElementException`.
 */
export function leftOrFailException<R, E, B, C>(self: Effect<R, E, E.Either<B, C>>) {
  return leftOrFail_(self, () => new NoSuchElementException())
}
