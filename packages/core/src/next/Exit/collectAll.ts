import * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as C from "../Cause"

import { Exit } from "./exit"
import { map } from "./map"
import { zipWith } from "./zipWith"

/**
 * Collects all the success states and merges sequentially the causes
 */
export const collectAll = <E, A>(
  ...exits: readonly Exit<E, A>[]
): O.Option<Exit<E, readonly A[]>> =>
  pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.dropLeft_(exits, 1),
        A.reduce(
          pipe(
            head,
            map((x): readonly A[] => [x])
          ),
          (acc, el) =>
            pipe(
              acc,
              zipWith(el, (acc, el) => [el, ...acc], C.Then)
            )
        ),
        map(A.reverse)
      )
    )
  )
