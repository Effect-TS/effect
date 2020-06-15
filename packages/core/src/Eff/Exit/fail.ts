import * as C from "../Cause"

import { halt } from "./halt"

/**
 * Constructs a failed exit with the specified checked error
 */
export const fail = <E>(e: E) => halt(C.Fail(e))
