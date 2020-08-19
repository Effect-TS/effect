import { Fail } from "../Cause/cause"

import { halt } from "./core"

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 */
export const fail = <E>(e: E) => halt(Fail(e))
