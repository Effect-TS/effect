import type { LazyArg } from "../../../data/Function"
import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import { HasRandom } from "../definition"

/**
 * @tsplus static ets/RandomOps shuffle
 */
export function shuffle<A>(
  iterable: LazyArg<Iterable<A>>,
  __tsplusTrace?: string
): RIO<HasRandom, Iterable<A>> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.shuffle(iterable))
}
