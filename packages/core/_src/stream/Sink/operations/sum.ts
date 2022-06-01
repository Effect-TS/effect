/**
 * A sink that sums incoming numeric values.
 *
 * @tsplus static ets/Sink/Ops sum
 */
export function sum(
  __tsplusTrace?: string
): Sink<never, never, number, never, number> {
  return Sink.foldLeft(0, (acc, curr) => acc + curr)
}
