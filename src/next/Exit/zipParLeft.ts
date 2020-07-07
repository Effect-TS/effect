import { pipe } from "../../Function"
import * as C from "../Cause"

import { Exit } from "./exit"
import { zipWith } from "./zipWith"

/**
 * Parallelly zips the this result with the specified result discarding the second element of the tuple or else returns the failed `Cause[E1]`
 */
export const zipParLeft = <E1, B>(that: Exit<E1, B>) => <E, A>(
  exit: Exit<E, A>
): Exit<E | E1, A> =>
  pipe(
    exit,
    zipWith(that, (a, _) => a, C.Both)
  )
