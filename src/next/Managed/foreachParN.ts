import { foreachParN_ } from "./foreachParN_"
import { Managed } from "./managed"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN = (n: number) => <S, R, E, A, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (as: Iterable<A>): Managed<unknown, R, E, readonly B[]> => foreachParN_(n)(as, f)
