import { fromDelays } from "./fromDelays"
import { map_ } from "./map_"
import { unfold_ } from "./unfold_"

/**
 * A schedule that always recurs, increasing delays by summing the
 * preceding two delays (similar to the fibonacci sequence). Returns the
 * current duration between recurrences.
 */
export const fibonacci = (one: number) =>
  fromDelays(
    map_(
      unfold_([one, one] as const, ([a, b]) => [b, a + b] as const),
      ([a, _]) => a
    )
  )
