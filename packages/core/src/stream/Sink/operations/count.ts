import { Sink } from "../definition"

/**
 * A sink that counts the number of elements fed to it.
 *
 * @tsplus static ets/SinkOps count
 */
export function count(
  __tsplusTrace?: string
): Sink<unknown, never, unknown, never, number> {
  return Sink.foldLeft(0, (acc, _) => acc + 1)
}
