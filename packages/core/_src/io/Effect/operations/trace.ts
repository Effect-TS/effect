import { ITrace } from "@effect/core/io/Effect/definition/primitives"

/**
 * Capture the trace at the current point.
 *
 * @tsplus static effect/core/io/Effect.Ops trace
 */
export function trace(__tsplusTrace?: string): Effect<never, never, Trace> {
  return new ITrace(__tsplusTrace)
}
