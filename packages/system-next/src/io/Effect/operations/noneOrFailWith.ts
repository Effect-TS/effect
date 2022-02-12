import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an Option into a IO. If the option is empty it succeeds with Unit. If
 * the option is defined it fails with an error adapted with f.
 *
 * @tsplus static ets/EffectOps noneOrFailWith
 */
export function noneOrFailWith<E, A>(
  option: LazyArg<Option<A>>,
  f: (a: A) => E,
  __etsTrace?: string
): IO<E, void> {
  return Effect.getOrFailDiscard(option).flip().mapError(f)
}
