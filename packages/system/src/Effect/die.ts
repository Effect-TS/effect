import { Die } from "../Cause/cause"

import { halt } from "./core"

/**
 * Returns an effect that dies with the specified `unknown`.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 */
export const die = (e: unknown) => halt(Die(e))
