import { forever } from "./forever"
import { fromDelays } from "./fromDelays"
import { map_ } from "./map_"

/**
 * A schedule that always recurs, but will repeat on a linear time
 * interval, given by `base * n` where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export const linear = (base: number) => fromDelays(map_(forever, (i) => base * (i + 1)))
