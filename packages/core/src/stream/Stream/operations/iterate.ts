import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Stream } from "../definition"

/**
 * Returns an infinite stream of iterative function application: `a`, `f(a)`,
 * `f(f(a))`, `f(f(f(a)))`, ...
 *
 * @tsplus static ets/StreamOps iterate
 */
export function iterate<A>(
  a: LazyArg<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.unfold(a, (a) => Option.some(Tuple(a, f(a))))
}
