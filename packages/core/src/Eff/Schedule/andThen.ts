import { andThen_ } from "./andThen_"
import { Schedule } from "./schedule"

/**
 * The same as `andThenEither`, but merges the output.
 */
export const andThen = <S, R, B, A, R1, S1, C, A1 extends A = A>(
  that: Schedule<S1, R1, A1, C>
) => (self: Schedule<S, R, A, B>) => andThen_(self, that)
