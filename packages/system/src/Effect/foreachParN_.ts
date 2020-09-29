import { pipe } from "../Function"
import { makeSemaphore, withPermit } from "../Semaphore/semaphore"
import { chain } from "./core"
import type { Effect } from "./effect"
import { foreachPar_ } from "./foreachPar_"

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export function foreachParN_(n: number) {
  return <A, R, E, B>(
    as: Iterable<A>,
    f: (a: A) => Effect<R, E, B>
  ): Effect<R, E, readonly B[]> =>
    pipe(
      makeSemaphore(n),
      chain((s) => foreachPar_(as, (a) => withPermit(s)(f(a))))
    )
}
