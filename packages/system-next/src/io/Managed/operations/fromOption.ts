import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Lifts an `Option` into a `Managed` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @ets static ets/ManagedOps fromOption
 */
export function fromOption<A>(
  option: LazyArg<Option<A>>,
  __etsTrace?: string
): Managed<unknown, Option<never>, A> {
  return Managed.succeed(option).flatMap((_) =>
    _.fold(() => Managed.failNow(Option.none), Managed.succeedNow)
  )
}
