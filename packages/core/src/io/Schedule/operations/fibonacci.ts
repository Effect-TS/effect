import type { Duration } from "@fp-ts/data/Duration"
import { add } from "@fp-ts/data/Duration"

/**
 * A schedule that always recurs, increasing delays by summing the preceding
 * two delays (similar to the fibonacci sequence). Returns the current
 * duration between recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops fibonacci
 * @category constructors
 * @since 1.0.0
 */
export function fibonacci(
  one: Duration
): Schedule<readonly [Duration, Duration], never, unknown, Duration> {
  return Schedule.delayed(
    Schedule.unfold([one, one] as const, ([a1, a2]) => [a2, add(a2)(a1)] as const).map(
      (out) => out[0]
    )
  )
}
