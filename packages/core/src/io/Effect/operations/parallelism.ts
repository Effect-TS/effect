import { Option } from "../../../data/Option"
import { currentParallelism } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { getWith_ } from "../../FiberRef/operations/getWith"
import { locally_ } from "../../FiberRef/operations/locally"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 *
 * @tsplus static ets/EffectOps parallelism
 */
export function parallelism(__tsplusTrace?: string): UIO<Option<number>> {
  return get(currentParallelism.value)
}

/**
 * Retrieves the current maximum number of fibers for parallel operators and
 * uses it to run the specified effect.
 *
 * @tsplus static ets/EffectOps parallelismWith
 */
export function parallelismWith<R, E, A>(
  f: (parallelism: Option<number>) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return getWith_(currentParallelism.value, f)
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @tsplus fluent ets/Effect withParallelism
 */
export function withParallelism_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(locally_(currentParallelism.value, Option.some(n))(self))
}

/**
 * Runs the specified effect with the specified maximum number of fibers for
 * parallel operators.
 *
 * @ets_data_first withParallelism_
 */
export function withParellelism(n: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => self.withParallelism(n)
}

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operators.
 *
 * @tsplus fluent ets/Effect withParallelismUnbounded
 */
export function withParallelismUnbounded<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(locally_(currentParallelism.value, Option.none)(self))
}
