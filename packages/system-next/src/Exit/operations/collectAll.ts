import { then } from "../../Cause/definition"
import * as V from "../../Collections/Immutable/Vector/core"
import { pipe } from "../../Function"
import * as I from "../../Iterable"
import * as O from "../../Option"
import type { Exit } from "../definition"
import { map, map_ } from "./map"
import { zipWith_ } from "./zipWith"

export function collectAll<E, A>(
  exits: Iterable<Exit<E, A>>
): O.Option<Exit<E, V.Vector<A>>> {
  const head = exits[Symbol.iterator]().next()
  if (!head.done && head.value) {
    return O.some(
      pipe(
        I.skip_(exits, 1),
        I.reduce(map_(head.value, V.of), (acc, el) =>
          zipWith_(acc, el, (list, a) => V.prepend_(list, a), then)
        ),
        map(V.reverse)
      )
    )
  }
  return O.none
}
