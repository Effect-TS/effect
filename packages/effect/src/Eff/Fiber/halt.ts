import { Cause } from "../Cause/cause"
import { halt as haltExit } from "../Exit/halt"

import { done } from "./done"

/**
 * Creates a `Fiber` that is halted with the specified cause.
 */
export const halt = <E>(cause: Cause<E>) => done(haltExit(cause))
