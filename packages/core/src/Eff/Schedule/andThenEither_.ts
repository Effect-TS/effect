import * as E from "../../Either"
import { chain_ } from "../Effect/chain_"
import { map_ as effectMap_ } from "../Effect/map_"
import { orElse_ as effectOrElse_ } from "../Effect/orElse_"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Returns a new schedule that first executes this schedule to completion,
 * and then executes the specified schedule to completion.
 */
export const andThenEither_ = <S, R, B, A, R1, S1, C, A1 extends A = A>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S1, R1, A1, C>
) =>
  new ScheduleClass<S | S1, R & R1, E.Either<any, any>, A1, E.Either<B, C>>(
    effectMap_(self.initial, (s2) => E.left(s2)),
    (a, s12) =>
      E.fold_(
        s12,
        (s2) =>
          effectOrElse_(
            effectMap_(self.update(a, s2), (x) => E.left(x)),
            () =>
              effectMap_(
                chain_(that.initial, (s1) => that.update(a, s1)),
                (x) => E.right(x)
              )
          ),
        (s1) => effectMap_(that.update(a, s1), E.right)
      ),
    (a: A1, s12: E.Either<any, any>) =>
      E.fold_(
        s12,
        (e) => E.left(self.extract(a, e)),
        (e) => E.right(that.extract(a, e))
      )
  )
