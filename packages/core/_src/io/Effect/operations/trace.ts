import { ITrace } from "@effect-ts/core/io/Effect/definition/primitives";

/**
 * Capture the trace at the current point.
 *
 * @tsplus static ets/Effect/Ops trace
 */
export function trace(__tsplusTrace?: string): UIO<Trace> {
  return new ITrace(__tsplusTrace);
}
