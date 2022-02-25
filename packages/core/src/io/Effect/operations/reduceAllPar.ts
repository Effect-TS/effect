import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * @tsplus static ets/EffectOps reduceAllPar
 */
export function reduceAllPar<R, E, A>(
  a: LazyArg<Effect<R, E, A>>,
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  f: (acc: A, a: A) => A,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(
    Effect.mergeAllPar<R, E, A, Option<A>>(
      Iter.concat(Iter.of(a()), as()),
      Option.none,
      (acc, elem) =>
        Option.some(
          acc.fold(
            () => elem,
            (a) => f(a, elem)
          )
        )
    ).map((option) =>
      option.getOrElse(() => {
        throw new Error("Bug")
      })
    )
  )
}
