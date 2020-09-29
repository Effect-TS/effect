import { pipe } from "../Function"
import { makeSemaphore, withPermit } from "../Semaphore"
import { chain } from "./core"
import type { Effect } from "./effect"
import { foreachUnitPar_ } from "./foreachUnitPar_"

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export function foreachUnitParN_(n: number) {
  return <A, R, E>(
    as: Iterable<A>,
    f: (a: A) => Effect<R, E, any>
  ): Effect<R, E, void> =>
    pipe(
      makeSemaphore(n),
      chain((s) => foreachUnitPar_(as, (a) => withPermit(s)(f(a))))
    )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export function foreachUnitParN(n: number) {
  return <A, R, E>(f: (a: A) => Effect<R, E, any>) => (
    as: Iterable<A>
  ): Effect<R, E, void> => foreachUnitParN_(n)(as, f)
}
