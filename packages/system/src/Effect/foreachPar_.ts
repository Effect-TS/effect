import { flow } from "../Function"
import { traceF, traceFrom, traceWith } from "../Tracing"
import { chain_, effectTotal, suspend } from "./core"
import type { Effect } from "./effect"
import { traced, untraced } from "./executionTraces"
import { foreachUnitPar_ } from "./foreachUnitPar_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, readonly B[]> {
  const trace = traceF(() => flow(traceWith("Effect/foreachPar_"), traceFrom(f)))
  const arr = Array.from(as)

  return chain_(
    effectTotal<B[]>(() => []),
    trace((array) => {
      const fn = ([a, n]: [A, number]) =>
        chain_(
          suspend(() => traced(f(a))),
          (b) =>
            effectTotal(() => {
              array[n] = b
            })
        )
      return untraced(
        chain_(
          foreachUnitPar_(
            arr.map((a, n) => [a, n] as [A, number]),
            fn
          ),
          () => effectTotal(() => array)
        )
      )
    })
  )
}
