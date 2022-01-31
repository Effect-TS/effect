import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Returns a `Managed` with the `None` value.
 *
 * @ets static ets/ManagedOps none
 */
export const none: Managed<unknown, never, Option<never>> = Managed.succeedNow(
  Option.none
)
