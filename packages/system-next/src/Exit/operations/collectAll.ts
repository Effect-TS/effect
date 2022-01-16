// ets_tracing: off

import * as C from "../../Cause"
import * as L from "../../Collections/Immutable/List"
import { pipe } from "../../Function"
import * as I from "../../Iterable"
import * as O from "../../Option"
import type { Exit } from "../definition"
import { map, map_ } from "./map"
import { zipWith_ } from "./zipWith"

export function collectAll<E, A>(
  exits: Iterable<Exit<E, A>>
): O.Option<Exit<E, L.List<A>>> {
  const head = exits[Symbol.iterator]().next()
  if (!head.done && head.value) {
    return O.some(
      pipe(
        I.skip_(exits, 1),
        I.reduce(map_(head.value, L.of), (acc, el) =>
          zipWith_(acc, el, (list, a) => L.prepend_(list, a), C.then)
        ),
        map(L.reverse)
      )
    )
  }
  return O.none
}
