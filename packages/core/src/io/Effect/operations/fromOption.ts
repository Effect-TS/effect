import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an `Option` into an `Effect` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @tsplus static ets/EffectOps fromOption
 */
export function fromOption<A>(
  option: LazyArg<Option<A>>,
  __tsplusTrace?: string
): IO<Option<never>, A> {
  return Effect.succeed(option).flatMap((option) =>
    option.fold(Effect.fail(Option.none), Effect.succeedNow)
  )
}
