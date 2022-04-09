/**
 * A sink that counts the number of elements fed to it.
 *
 * @tsplus static ets/Sink/Ops count
 */
export function count(
  __tsplusTrace?: string
): Sink<unknown, never, unknown, never, number> {
  return Sink.foldLeft(0, (acc, _) => acc + 1);
}
