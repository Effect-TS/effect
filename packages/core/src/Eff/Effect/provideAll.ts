import { Effect } from "./effect"
import { IProvide } from "./primitives"

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export const provideAll = <R>(r: R) => <S, E, A>(
  next: Effect<S, R, E, A>
): Effect<S, unknown, E, A> => new IProvide(r, next)
