import { Effect } from "./effect"
import { IFlatMap } from "./primitives"

/**
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 */
export const chain = <S1, R1, E1, A1, A>(f: (a: A) => Effect<S1, R1, E1, A1>) => <
  S,
  R,
  E
>(
  val: Effect<S, R, E, A>
): Effect<S | S1, R & R1, E | E1, A1> => new IFlatMap(val, f)
