import { fail as failExit } from "../Exit/fail"

import { done } from "./done"

/**
 * A fiber that has already failed with the specified value.
 */
export const fail = <E>(e: E) => done(failExit(e))
