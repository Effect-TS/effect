/**
 * A schedule that always recurs, mapping input values through the specified
 * function.
 *
 * @tsplus static effect/core/io/Schedule.Ops fromFunction
 */
export function fromFunction<A, B>(
  f: (a: A) => B
): Schedule<void, never, A, B> {
  return Schedule.identity<A>().map(f)
}
