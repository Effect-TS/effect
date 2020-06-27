import { map_ } from "../Effect/map_"
import { nextDouble } from "../Random"

import { delayedM_ } from "./delayedM_"
import { Schedule } from "./schedule"

/**
 * Applies random jitter to all sleeps executed by the schedule.
 */
export const jittered_ = <S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  min: number,
  max: number
) =>
  delayedM_(self, (d) =>
    map_(nextDouble, (random) => Math.floor(d * min * (1 - random) + d * max * random))
  )

/**
 * Applies random jitter to all sleeps executed by the schedule.
 */
export const jittered = (min: number, max: number) => <S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>
) => jittered_(self, min, max)
