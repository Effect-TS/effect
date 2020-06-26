import { unit as effectUnit } from "../Effect/unit"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * A schedule that recurs forever, returning each input as the output.
 */
export const id = <A>(): Schedule<never, unknown, A, A> =>
  new ScheduleClass<never, unknown, void, A, A>(
    effectUnit,
    () => effectUnit,
    (a) => a
  )
