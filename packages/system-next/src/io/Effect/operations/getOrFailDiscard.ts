import type { LazyArg } from "../../../data/Function"
import { constVoid } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @tsplus static ets/EffectOps getOrFailDiscard
 */
export function getOrFailDiscard<A>(
  option: LazyArg<Option<A>>,
  __etsTrace?: string
): IO<void, A> {
  return Effect.getOrFailWith(option, constVoid)
}
