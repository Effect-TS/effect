/**
 * A schedule that always recurs, increasing delays by summing the preceding
 * two delays (similar to the fibonacci sequence). Returns the current
 * duration between recurrences.
 *
 * @tsplus static ets/Schedule/Ops fibonacci
 */
export function fibonacci(
  one: Duration
): Schedule<Tuple<[Duration, Duration]>, unknown, unknown, Duration> {
  return Schedule.delayed(
    Schedule.unfold(Tuple(one, one), ({ tuple: [a1, a2] }) => Tuple(a2, a1 + a2)).map(
      (out) => out.get(0)
    )
  )
}
