/**
 * A sink that counts the number of elements fed to it.
 *
 * @tsplus static effect/core/stream/Sink.Ops count
 * @category constructors
 * @since 1.0.0
 */
export function count(): Sink<never, never, unknown, never, number> {
  return Sink.foldLeft(0, (acc, _) => acc + 1)
}
