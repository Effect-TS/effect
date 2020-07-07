import { pipe, identity } from "../../Function"

import { chain } from "./chain"
import { Exit } from "./exit"

/**
 * Flatten nested Exits
 */
export const flatten = <E, E1, A>(exit: Exit<E, Exit<E1, A>>) =>
  pipe(exit, chain(identity))
