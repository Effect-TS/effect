import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import { HasRandom } from "../definition"

/**
 * @tsplus static ets/RandomOps nextRange
 */
export function nextRange(low: number, high: number): RIO<HasRandom, number> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.nextRange(low, high))
}
