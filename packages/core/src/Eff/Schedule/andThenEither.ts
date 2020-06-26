import { andThenEither_ } from "./andThenEither_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that first executes this schedule to completion,
 * and then executes the specified schedule to completion.
 */
export const andThenEither = <S1, R1, C, A2, A1 extends A2 = A2>(
  that: Schedule<S1, R1, A1, C>
) => <S, R, B>(self: Schedule<S, R, A2, B>) => andThenEither_(self, that)
