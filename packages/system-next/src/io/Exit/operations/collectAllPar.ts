import * as I from "../../../collection/immutable/Iterable"
import * as L from "../../../collection/immutable/List/core"
import { pipe } from "../../../data/Function"
import * as O from "../../../data/Option"
import { both } from "../../Cause/definition"
import type { Exit } from "../definition"
import { map, map_ } from "./map"
import { zipWith_ } from "./zipWith"

export function collectAllPar<E, A>(
  exits: Iterable<Exit<E, A>>
): O.Option<Exit<E, L.List<A>>> {
  const head = exits[Symbol.iterator]().next()
  if (!head.done && head.value) {
    return O.some(
      pipe(
        I.skip_(exits, 1),
        I.reduce(map_(head.value, L.of), (acc, el) =>
          zipWith_(acc, el, (list, a) => L.prepend_(list, a), both)
        ),
        map(L.reverse)
      )
    )
  }
  return O.none
}
