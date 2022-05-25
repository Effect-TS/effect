/**
 * A schedule that always recurs, mapping input values through the specified
 * function.
 *
 * @tsplus static ets/Schedule/Ops fromFunction
 */
export function fromFunction<A, B>(
  f: (a: A) => B
): Schedule<void, unknown, A, B> {
  return Schedule.identity<A>().map(f)
}
