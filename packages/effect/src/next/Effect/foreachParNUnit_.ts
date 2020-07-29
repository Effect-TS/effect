import { pipe } from "../../Function"
import { makeSemaphore, withPermit } from "../Semaphore"

import { chain } from "./chain"
import { AsyncRE, Effect } from "./effect"
import { foreachPar_ } from "./foreachPar_"

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachParNUnit_ = (n: number) => <A, S, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, any>
): AsyncRE<R, E, void> =>
  pipe(
    makeSemaphore(n),
    chain((s) => foreachPar_(as, (a) => withPermit(s)(f(a))))
  )

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachParNUnit = (n: number) => <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, any>
) => (as: Iterable<A>): AsyncRE<R, E, void> => foreachParNUnit_(n)(as, f)
