/**
 * Composes the specified generators to create a cartesian product of elements
 * with the specified function.
 *
 * @tsplus static effect/core/testing/Gen.Ops collectAll
 */
export function collectAll<R, A>(gens: Collection<Gen<R, A>>): Gen<R, List<A>> {
  return gens.reduce(
    Gen.constant(List.empty<A>()) as Gen<R, List<A>>,
    (acc, curr) => acc.zipWith(curr, (list, a) => list.prepend(a))
  ).map((list) => list.reverse)
}
