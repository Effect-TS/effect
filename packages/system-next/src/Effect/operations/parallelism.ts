// ets_tracing: off

import { currentParallelism } from "../../FiberRef/definition/concrete"
import { get } from "../../FiberRef/operations/get"
import { getWith_ } from "../../FiberRef/operations/getWith"
import { locally_ } from "../../FiberRef/operations/locally"
import * as O from "../../Option"
import type { Effect, UIO } from "../definition"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 */
export function parallelism(__trace?: string): UIO<O.Option<number>> {
  return get(currentParallelism.value, __trace)
}

/**
 * Retrieves the current maximum number of fibers for parallel operators and
 * uses it to run the specified effect.
 */
export function parallelismWith<R, E, A>(
  f: (parallelism: O.Option<number>) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return getWith_(currentParallelism.value, f, __trace)
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 */
export function withParallelism_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __trace?: string
): Effect<R, E, A> {
  return suspendSucceed(
    () => locally_(currentParallelism.value, O.some(n), self),
    __trace
  )
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @ets_data_first withParallelism_
 */
export function withParellelism(n: number, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    withParallelism_(self, n, __trace)
}

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operators.
 */
export function withParallelismUnbounded<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return suspendSucceed(() => locally_(currentParallelism.value, O.none, self), __trace)
}
