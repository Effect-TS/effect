import { ITrace } from "@effect/core/io/Effect/definition/primitives";

/**
 * Capture the trace at the current point.
 *
 * @tsplus static ets/Effect/Ops trace
 */
export function trace(__tsplusTrace?: string): Effect.UIO<Trace> {
  return new ITrace(__tsplusTrace);
}
