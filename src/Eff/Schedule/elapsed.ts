import { currentTime, HasClock } from "../Clock"
import { map_ } from "../Effect/map_"

import { Schedule } from "./schedule"

export const elapsed =
  /*#__PURE__*/
  new Schedule<never, HasClock, [number, number], unknown, number>(
    map_(currentTime, (n) => [n, 0]),
    (_, [start, __]) => map_(currentTime, (n) => [start, n - start]),
    (_, [__, n]) => n
  )
