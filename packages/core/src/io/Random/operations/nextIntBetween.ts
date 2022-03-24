import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import { HasRandom } from "../definition"

/**
 * @tsplus static ets/RandomOps nextIntBetween
 */
export function nextIntBetween(low: number, high: number): RIO<HasRandom, number> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.nextIntBetween(low, high))
}
