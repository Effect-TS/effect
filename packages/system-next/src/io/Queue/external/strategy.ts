import type { BackPressureStrategy } from "../../Effect/operations/excl-forEach"
import { makeBackPressureStrategy } from "../../Effect/operations/excl-forEach"

export { BackPressureStrategy } from "../../Effect/operations/excl-forEach"

/**
 * @tsplus static ets/QueueStrategyOps BackPressure
 */
export const backPressureStrategy: <A>() => BackPressureStrategy<A> =
  makeBackPressureStrategy
