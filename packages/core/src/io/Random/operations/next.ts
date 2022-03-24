import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import { HasRandom } from "../definition"

/**
 * @tsplus static ets/RandomOps next
 */
export const next: RIO<HasRandom, number> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.next
)
