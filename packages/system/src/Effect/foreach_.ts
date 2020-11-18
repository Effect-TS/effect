import * as FA from "../FreeAssociative"
import { flow } from "../Function"
import * as IT from "../Iterable"
import { traceF, traceFrom, traceWith } from "../Tracing"
import { succeed, suspend } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"
import { zipWith_ } from "./zipWith_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>) {
  const trace = traceF(() => flow(traceWith("Effect/foreach_"), traceFrom(f)))
  const toArray = trace(FA.toArray)
  return map_(
    IT.reduce_(
      as,
      succeed(FA.init<B>()) as Effect<R, E, FA.FreeAssociative<B>>,
      (b, a) =>
        zipWith_(
          b,
          suspend(trace(() => f(a))),
          trace((acc, r) => FA.append(r)(acc))
        )
    ),
    toArray
  )
}
