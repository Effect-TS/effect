import * as Iter from "../../../collection/immutable/Iterable"
import { List } from "../../../collection/immutable/List"
import { Option } from "../../../data/Option"
import type { Exit } from "../definition"

/**
 * @tsplus static ets/ExitOps collectAll
 */
export function collectAll<E, A>(
  exits: Iterable<Exit<E, A>>
): Option<Exit<E, List<A>>> {
  const head = exits[Symbol.iterator]().next()
  if (!head.done && head.value) {
    return Option.some(
      Iter.reduce_(Iter.skip_(exits, 1), head.value.map(List.single), (acc, el) =>
        acc.zipWith(
          el,
          (list, a) => list.prepend(a),
          (e1, e2) => e1 + e2
        )
      ).map((_) => _.reverse())
    )
  }
  return Option.none
}
