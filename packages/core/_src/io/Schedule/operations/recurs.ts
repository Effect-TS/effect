/**
 * A schedule spanning all time, which can be stepped only the specified
 * number of times before it terminates.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurs
 */
export function recurs(
  n: number
): Schedule<number, never, unknown, number> {
  return Schedule.repeatForever.whileOutput((out) => out < n)
}
