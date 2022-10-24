import type { BackPressureStrategy } from "@effect/core/io/Effect/operations/excl-forEach"
import { makeBackPressureStrategy } from "@effect/core/io/Effect/operations/excl-forEach"

export { BackPressureStrategy } from "@effect/core/io/Effect/operations/excl-forEach"

/**
 * @tsplus static effect/core/io/Queue/Strategy.Ops BackPressure
 * @category constructors
 * @since 1.0.0
 */
export const backPressureStrategy: <A>() => BackPressureStrategy<A> = makeBackPressureStrategy
