/**
 * @tsplus static ets/Exit/Ops collectAllPar
 */
export function collectAllPar<E, A>(
  exits: Collection<Exit<E, A>>
): Option<Exit<E, List<A>>> {
  const head = exits[Symbol.iterator]().next()
  if (!head.done && head.value) {
    return Option.some(
      exits.skip(1).reduce(
        head.value.map((a) => List(a)),
        (acc, el) => acc.zipWith(el, (list, a) => list.prepend(a), Cause.both)
      )
    )
  }
  return Option.none
}
