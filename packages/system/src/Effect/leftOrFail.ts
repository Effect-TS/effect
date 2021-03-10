// tracing: off

import { accessCallTrace, traceAs, traceFrom } from "@effect-ts/tracing-utils"

import * as E from "../Either"
import { NoSuchElementException } from "../GlobalExceptions"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { failWith } from "./fail"

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @trace 1
 */
export function leftOrFail_<R, E, B, C, E1>(
  self: Effect<R, E, E.Either<B, C>>,
  orFail: (c: C) => E1
) {
  return chain_(
    self,
    E.fold(succeed, (x) => failWith(traceAs(orFail, () => orFail(x))))
  )
}

/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @dataFirst leftOrFail_
 * @trace 0
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1) {
  return <R, E, B>(self: Effect<R, E, E.Either<B, C>>) => leftOrFail_(self, orFail)
}

/**
 * Returns a successful effect if the value is `Left`, or fails with a `NoSuchElementException`.
 *
 * @trace call
 */
export function leftOrFailException<R, E, B, C>(self: Effect<R, E, E.Either<B, C>>) {
  const trace = accessCallTrace()
  return leftOrFail_(
    self,
    traceFrom(trace, () => new NoSuchElementException())
  )
}
