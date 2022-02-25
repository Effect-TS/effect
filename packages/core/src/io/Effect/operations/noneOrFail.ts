import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an Option into a IO. If the option is empty it succeeds with Unit. If
 * the option is defined it fails with the content.
 *
 * @tsplus static ets/EffectOps noneOrFail
 */
export function noneOrFail<E>(
  option: LazyArg<Option<E>>,
  __tsplusTrace?: string
): IO<E, void> {
  return Effect.getOrFailDiscard(option).flip()
}
