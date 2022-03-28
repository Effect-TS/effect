import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import { HasRandom } from "../definition"

/**
 * @tsplus static ets/RandomOps nextBoolean
 */
export const nextBoolean: RIO<HasRandom, boolean> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.nextBoolean
)
