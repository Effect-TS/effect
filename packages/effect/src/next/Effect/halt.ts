import { Cause } from "../Cause/cause"

import { SyncE } from "./effect"
import { IFail } from "./primitives"

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export const halt = <E>(cause: Cause<E>): SyncE<E, never> => new IFail(cause)
