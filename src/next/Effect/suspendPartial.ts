import { Effect } from "./effect"
import { ISuspendPartial } from "./primitives"

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effectPartial(orThrow, io))`.
 */
export const suspendPartial = <E2>(onThrow: (u: unknown) => E2) => <S, R, E, A>(
  factory: () => Effect<S, R, E, A>
): Effect<S, R, E | E2, A> => new ISuspendPartial(factory, onThrow)
