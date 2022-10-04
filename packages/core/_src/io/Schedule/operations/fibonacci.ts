/**
 * A schedule that always recurs, increasing delays by summing the preceding
 * two delays (similar to the fibonacci sequence). Returns the current
 * duration between recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops fibonacci
 */
export function fibonacci(
  one: Duration
): Schedule<readonly [Duration, Duration], never, unknown, Duration> {
  return Schedule.delayed(
    Schedule.unfold([one, one] as const, ([a1, a2]) => [a2, a1 + a2] as const).map(
      (out) => out[0]
    )
  )
}
