import * as O from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * @tsplus static ets/EffectOps reduceAllPar
 */
export function reduceAllPar_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  a: Effect<R, E, A>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(() =>
    Effect.mergeAllPar(as, O.emptyOf<A>(), (acc, elem) =>
      O.some(
        O.fold_(
          acc,
          () => elem,
          (a) => f(a, elem)
        )
      )
    ).map(
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
  __etsTrace?: string
) {
  return (as: Iterable<Effect<R, E, A>>) => reduceAllPar_(as, a, f)
}
