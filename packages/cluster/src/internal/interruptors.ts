import type { FiberId } from "effect/FiberId"

/** @internal */
export const internalInterruptors = new WeakSet<FiberId>()
