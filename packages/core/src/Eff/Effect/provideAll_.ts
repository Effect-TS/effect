import { Effect } from "./effect"
import { IProvide } from "./primitives"

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export const provideAll_ = <S, R, E, A>(
  next: Effect<S, R, E, A>,
  r: R
): Effect<S, unknown, E, A> => new IProvide(r, next)
