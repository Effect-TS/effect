import type { Option } from "../../../data/Option"
import { fold, none } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Lifts an `Option` into a `Managed` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @ets static ets/ManagedOps fromOptionNow
 */
export function fromOptionNow<A>(
  option: Option<A>,
  __etsTrace?: string
): Managed<unknown, Option<never>, A> {
  return Managed.succeedNow(option).flatMap(
    fold(() => Managed.failNow(none), Managed.succeedNow)
  )
}
