import { unit as effectUnit } from "../Effect/unit"

import { Schedule } from "./schedule"

/**
 * A schedule that recurs forever, returning each input as the output.
 */
export const id = <A>(): Schedule<never, unknown, void, A, A> =>
  new Schedule<never, unknown, void, A, A>(
    effectUnit,
    () => effectUnit,
    (a) => a
  )
