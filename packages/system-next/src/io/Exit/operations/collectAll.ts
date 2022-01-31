import * as I from "../../../collection/immutable/Iterable"
import { List } from "../../../collection/immutable/List"
import { pipe } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { map, map_ } from "./map"
import { zipWith_ } from "./zipWith"

export function collectAll<E, A>(
  exits: Iterable<Exit<E, A>>
): Option<Exit<E, List<A>>> {
  const head = exits[Symbol.iterator]().next()
  if (!head.done && head.value) {
    return Option.some(
      pipe(
        I.skip_(exits, 1),
        I.reduce(map_(head.value, List.single), (acc, el) =>
          zipWith_(acc, el, (list, a) => list.prepend(a), Cause.then)
        ),
        map((_) => _.reverse())
      )
    )
  }
  return Option.none
}
