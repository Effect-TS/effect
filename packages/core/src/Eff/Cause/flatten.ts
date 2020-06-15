import { pipe, identity } from "../../Function"

import { Cause } from "./cause"
import { chain } from "./chain"

/**
 * Equivalent to chain(identity)
 */
export const flatten = <E>(cause: Cause<Cause<E>>): Cause<E> =>
  pipe(cause, chain(identity))
