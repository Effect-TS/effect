import * as E from "../../Either"
import { chain_ } from "../Effect/chain_"
import { map_ as effectMap_ } from "../Effect/map_"
import { orElse_ as effectOrElse_ } from "../Effect/orElse_"

import { Schedule } from "./schedule"

/**
 * Returns a new schedule that first executes this schedule to completion,
 * and then executes the specified schedule to completion.
 */
export const andThenEither_ = <S, R, ST, B, A, S1, R1, ST1, C, A1 extends A = A>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>
) =>
  new Schedule<S | S1, R & R1, E.Either<ST, ST1>, A1, E.Either<B, C>>(
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
    (a: A1, s12: E.Either<ST, ST1>) =>
      E.fold_(
        s12,
        (e) => E.left(self.extract(a, e)),
        (e) => E.right(that.extract(a, e))
      )
  )
