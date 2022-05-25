import type { BackPressureStrategy } from "@effect/core/io/Effect/operations/excl-forEach"
import { makeBackPressureStrategy } from "@effect/core/io/Effect/operations/excl-forEach"

export { BackPressureStrategy } from "@effect/core/io/Effect/operations/excl-forEach"

/**
 * @tsplus static ets/QueueStrategy/Ops BackPressure
 */
export const backPressureStrategy: <A>() => BackPressureStrategy<A> = makeBackPressureStrategy
