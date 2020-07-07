import * as C from "../Cause"

import { Failure } from "./exit"

/**
 * Constructs a failed exit with the specified cause
 */
export const halt = <E>(cause: C.Cause<E>) => Failure(cause)
