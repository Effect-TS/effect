import { pipe } from "../../Function"

import { chain } from "./chain"
import { Exit } from "./exit"
import { succeed } from "./succeed"

/**
 * Maps over the value type.
 */
export const map_ = <E, A, A1>(exit: Exit<E, A>, f: (a: A) => A1): Exit<E, A1> =>
  pipe(
    exit,
    chain((a) => succeed(f(a)))
  )
