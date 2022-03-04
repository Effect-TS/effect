import { Option } from "../../../data/Option"
import type { USTM } from "../definition"
import { STM } from "../definition"

/**
 * Returns an effect with the optional value.
 *
 * @tsplus static ets/STMOps some
 */
export function succeedSome<A>(a: A): USTM<Option<A>> {
  return STM.succeed(Option.some(a))
}
