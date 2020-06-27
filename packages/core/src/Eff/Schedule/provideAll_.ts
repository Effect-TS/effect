import { provideAll_ as effectProvideAll_ } from "../Effect/provideAll_"

import { Schedule } from "./schedule"

/**
 * Provide all requirements to the schedule.
 */
export const provideAll_ = <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>, r: R) =>
  new Schedule<S, unknown, ST, A, B>(
    effectProvideAll_(self.initial, r),
    (a, s) => effectProvideAll_(self.update(a, s), r),
    (a, s) => self.extract(a, s)
  )
