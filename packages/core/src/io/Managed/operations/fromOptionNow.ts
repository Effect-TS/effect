import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Lifts an `Option` into a `Managed` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @tsplus static ets/ManagedOps fromOptionNow
 */
export function fromOptionNow<A>(
  option: Option<A>,
  __tsplusTrace?: string
): Managed<unknown, Option<never>, A> {
  return Managed.succeedNow(option).flatMap((_) =>
    _.fold(() => Managed.failNow(Option.none), Managed.succeedNow)
  )
}
