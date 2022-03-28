import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import { HasRandom } from "../definition"

/**
 * @tsplus static ets/RandomOps nextInt
 */
export const nextInt: RIO<HasRandom, number> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.nextInt
)
