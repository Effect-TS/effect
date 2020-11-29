import * as FA from "../FreeAssociative"
import { pipe } from "../Function"
import * as IT from "../Iterable"
import * as core from "./core"
import type { Effect } from "./effect"
import * as map from "./map"
import * as zipWith from "./zipWith"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>) {
  return map.map_(
    IT.reduce_(
      as,
      core.succeed(FA.init<B>()) as Effect<R, E, FA.FreeAssociative<B>>,
      (b, a) =>
        zipWith.zipWith_(
          b,
          core.suspend(() => f(a)),
          (acc, r) => FA.append(r)(acc)
        )
    ),
    FA.toArray
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @dataFirst foreach_
 */
export function foreach<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>) => foreach_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(as, f))`, but without the cost of building
 * the list of results.
 */
export function foreachUnit_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, any>
): Effect<R, E, void> {
  return pipe(
    core.effectTotal(() => as[Symbol.iterator]()),
    core.chain((iterator) => {
      function loop(): Effect<R, E, void> {
        const next = iterator.next()
        return next.done
          ? core.unit
          : pipe(
              f(next.value),
              core.chain(() => loop())
            )
      }
      return loop()
    })
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @dataFirst foreachUnit_
 */
export function foreachUnit<R, E, A>(
  f: (a: A) => Effect<R, E, any>
): (as: Iterable<A>) => Effect<R, E, void> {
  return (as) => foreachUnit_(as, f)
}
