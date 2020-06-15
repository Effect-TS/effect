import { pipe } from "../../Function"
import * as C from "../Cause"

import { Exit } from "./exit"
import { zipWith } from "./zipWith"

/**
 * Sequentially zips the this result with the specified result or else returns the failed `Cause[E1]`
 */
export const zip = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, [A, B]> =>
  pipe(
    exit,
    zipWith(that, (a, b) => [a, b], C.Then)
  )
