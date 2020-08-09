import { ExecutionStrategy, Parallel, ParallelN, Sequential } from "./ExecutionStrategy"
import { Effect, AsyncRE } from "./effect"
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
) => (as: Iterable<A>) => Effect<S, R, E, readonly B[]>
export function foreachExec(
  es: Parallel
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => AsyncRE<R, E, readonly B[]>
export function foreachExec(
  es: ParallelN
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => AsyncRE<R, E, readonly B[]>
export function foreachExec(
  es: ExecutionStrategy
): <S, R, E, A, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>) => Effect<unknown, R, E, readonly B[]> {
  return (f) => (as) => foreachExec_(es, as, f)
}
