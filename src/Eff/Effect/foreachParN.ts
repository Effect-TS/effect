import { AsyncRE, Effect } from "./effect"
import { foreachParN_ } from "./foreachParN_"

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN = (n: number) => <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (as: Iterable<A>): AsyncRE<R, E, readonly B[]> => foreachParN_(n)(as, f)
