import * as O from "../../Option"
import type { Effect } from "../definition"
import { map_ } from "./map"
import { mergeAllPar_ } from "./mergeAllPar"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 */
export function reduceAllPar_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  a: Effect<R, E, A>,
  f: (acc: A, a: A) => A,
  __trace?: string
): Effect<R, E, A> {
  return suspendSucceed(() =>
    map_(
      mergeAllPar_(
        as,
        O.emptyOf<A>(),
        (acc, elem) =>
          O.some(
            O.fold_(
              acc,
              () => elem,
              (a) => f(a, elem)
            )
          ),
        __trace
      ),
      O.getOrElse(() => {
        throw new Error("Bug")
      })
    )
  )
}

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * @ets_data_first reduceAllPar_
 */
export function reduceAllPar<R, E, A>(
  a: Effect<R, E, A>,
  f: (acc: A, a: A) => A,
  __trace?: string
) {
  return (as: Iterable<Effect<R, E, A>>) => reduceAllPar_(as, a, f, __trace)
}
