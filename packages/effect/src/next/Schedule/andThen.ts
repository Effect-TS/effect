import { andThen_ } from "./andThen_"
import { Schedule } from "./schedule"

/**
 * The same as `andThenEither`, but merges the output.
 */
export const andThen = <ST1, A, R1, S1, C, A1 extends A = A>(
  that: Schedule<S1, R1, ST1, A1, C>
) => <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => andThen_(self, that)
