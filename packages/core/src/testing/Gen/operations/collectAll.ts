import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Composes the specified generators to create a cartesian product of elements
 * with the specified function.
 *
 * @tsplus static effect/core/testing/Gen.Ops collectAll
 * @category constructors
 * @since 1.0.0
 */
export function collectAll<R, A>(gens: Iterable<Gen<R, A>>): Gen<R, List.List<A>> {
  return Array.from(gens).reduce(
    (acc, curr) => acc.zipWith(curr, (list, a) => pipe(list, List.prepend(a))),
    Gen.constant(List.empty<A>()) as Gen<R, List.List<A>>
  ).map(List.reverse)
}
