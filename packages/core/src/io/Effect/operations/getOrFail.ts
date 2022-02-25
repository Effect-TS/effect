import type { LazyArg } from "../../../data/Function"
import { NoSuchElementException } from "../../../data/GlobalExceptions"
import type { Option } from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an `Option` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @tsplus static ets/EffectOps getOrFail
 */
export function getOrFail<A>(
  option: LazyArg<Option<A>>,
  __tsplusTrace?: string
): IO<NoSuchElementException, A> {
  return Effect.getOrFailWith(option, new NoSuchElementException())
}
