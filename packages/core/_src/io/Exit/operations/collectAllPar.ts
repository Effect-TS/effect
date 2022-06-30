/**
 * @tsplus static effect/core/io/Exit.Ops collectAllPar
 */
export function collectAllPar<E, A>(
  exits: Collection<Exit<E, A>>
): Maybe<Exit<E, List<A>>> {
  const head = exits[Symbol.iterator]().next()
  if (!head.done && head.value) {
    return Maybe.some(
      exits.skip(1).reduce(
        head.value.map((a) => List(a)),
        (acc, el) => acc.zipWith(el, (list, a) => list.prepend(a), Cause.both)
      )
    )
  }
  return Maybe.none
}
