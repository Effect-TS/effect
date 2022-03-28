import { Sink } from "../definition"

/**
 * A sink that sums incoming numeric values.
 *
 * @tsplus static ets/SinkOps sum
 */
export function sum(
  __tsplusTrace?: string
): Sink<unknown, never, number, never, number> {
  return Sink.foldLeft(0, (acc, curr) => acc + curr)
}
