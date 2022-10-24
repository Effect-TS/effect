import { IYieldNow } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 *
 * @tsplus static effect/core/io/Effect.Ops yieldNow
 * @category constructors
 * @since 1.0.0
 */
export const yieldNow: Effect<never, never, void> = new IYieldNow()
