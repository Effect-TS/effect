import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Like chain but ignores the input
 */
export function andThen<S1, R1, E1, A1>(fb: Effect<S1, R1, E1, A1>) {
  return <S, R, E, A>(fa: Effect<S, R, E, A>) => andThen_(fa, fb)
}

/**
 * Like chain but ignores the input
 */
export function andThen_<S, R, E, A, S1, R1, E1, A1>(
  fa: Effect<S, R, E, A>,
  fb: Effect<S1, R1, E1, A1>
) {
  return chain_(fa, () => fb)
}
