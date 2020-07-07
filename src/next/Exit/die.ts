import * as C from "../Cause"

import { halt } from "./halt"

/**
 * Construct an Exit with an unchecked cause containing the specified error
 */
export const die = (error: unknown) => halt(C.Die(error))
