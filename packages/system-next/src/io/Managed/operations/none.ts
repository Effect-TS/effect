import * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { succeedNow } from "./succeedNow"

/**
 * Returns a `Managed` with the `None` value.
 */
export const none: Managed<unknown, never, O.Option<never>> = succeedNow(O.none)
