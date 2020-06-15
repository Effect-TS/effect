import { Effect } from "./effect"
import { ISuspend } from "./primitives"

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effectTotal(io))`.
 */
export const suspend = <S, R, E, A>(
  factory: () => Effect<S, R, E, A>
): Effect<S, R, E, A> => new ISuspend(factory)
