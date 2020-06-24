import { ExecutionStrategy, Parallel, ParallelN, Sequential } from "./ExecutionStrategy"
import { Effect } from "./effect"
import { foreachExec_ } from "./foreachExec_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachExec(
  es: Sequential
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<never, R, E, readonly B[]>
export function foreachExec<S, R, E, A, B>(
  es: Parallel
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, E, readonly B[]>
export function foreachExec<S, R, E, A, B>(
  es: ParallelN
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, E, readonly B[]>
export function foreachExec<S, R, E, A, B>(
  es: ExecutionStrategy
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, E, readonly B[]> {
  return (f) => (as) => foreachExec_(es, as, f)
}
