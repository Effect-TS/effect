import * as O from "../../../data/Option"
import { currentParallelism } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { getWith_ } from "../../FiberRef/operations/getWith"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Effect, UIO } from "../definition"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 *
 * @ets static ets/EffectOps parallelism
 */
export function parallelism(__etsTrace?: string): UIO<O.Option<number>> {
  return get(currentParallelism.value, __etsTrace)
}

/**
 * Retrieves the current maximum number of fibers for parallel operators and
 * uses it to run the specified effect.
 *
 * @ets static ets/EffectOps parallelismWith
 */
export function parallelismWith<R, E, A>(
  f: (parallelism: O.Option<number>) => Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return getWith_(currentParallelism.value, f, __etsTrace)
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @ets fluent ets/Effect withParallelism
 */
export function withParallelism_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __etsTrace?: string
): Effect<R, E, A> {
  return suspendSucceed(
    () => locally_(currentParallelism.value, O.some(n))(self),
    __etsTrace
  )
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @ets_data_first withParallelism_
 */
export function withParellelism(n: number, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    withParallelism_(self, n, __etsTrace)
}

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operators.
 *
 * @ets fluent ets/Effect withParallelismUnbounded
 */
export function withParallelismUnbounded<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return suspendSucceed(
    () => locally_(currentParallelism.value, O.none)(self),
    __etsTrace
  )
}
