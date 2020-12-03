import { pipe } from "../Function"
import * as Semaphore from "../Semaphore"
import * as core from "./core"
import type { Effect } from "./effect"
import * as foreach from "./foreach"

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
      Semaphore.makeSemaphore(n),
      core.chain((s) =>
        foreach.foreachUnitPar_(as, (a) => Semaphore.withPermit(s)(f(a)))
      )
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
