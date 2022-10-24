/**
 * A sink that sums incoming numeric values.
 *
 * @tsplus static effect/core/stream/Sink.Ops sum
 * @category constructors
 * @since 1.0.0
 */
export function sum(): Sink<never, never, number, never, number> {
  return Sink.foldLeft(0, (acc, curr) => acc + curr)
}
