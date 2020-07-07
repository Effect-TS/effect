import { provideSome_ as effectProvideSome_ } from "../Effect/provideSome"

import { Schedule } from "./schedule"

/**
 * Provide some of the requirements to the schedule.
 */
export const provideSome_ = <S, R, ST, A, B, R0>(
  self: Schedule<S, R, ST, A, B>,
  f: (r0: R0) => R
) =>
  new Schedule<S, R0, ST, A, B>(
    effectProvideSome_(self.initial, f),
    (a, s) => effectProvideSome_(self.update(a, s), f),
    (a, s) => self.extract(a, s)
  )
