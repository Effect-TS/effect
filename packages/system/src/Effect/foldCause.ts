// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import type { Cause } from "../Cause/cause"
import { foldCauseM_, succeed } from "./core"
import type { Effect, RIO } from "./effect"

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 *
 * @trace 1
 * @trace 2
 */
export function foldCause_<R, E, A, A2, A3>(
  value: Effect<R, E, A>,
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3
): RIO<R, A2 | A3> {
  return foldCauseM_(
    value,
    traceAs(failure, (c) => succeed(failure(c))),
    traceAs(failure, (x) => succeed(success(x)))
  )
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 *
 * @dataFirst foldCause_
 * @trace 0
 * @trace 1
 */
export function foldCause<E, A, A2, A3>(
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3
) {
  return <R>(value: Effect<R, E, A>): RIO<R, A2 | A3> =>
    foldCause_(value, failure, success)
}
