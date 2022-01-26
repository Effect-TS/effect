import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Returns a `Managed` with the `None` value.
 *
 * @ets static ets/ManagedOps none
 */
export const none: Managed<unknown, never, O.Option<never>> = Managed.succeedNow(O.none)
