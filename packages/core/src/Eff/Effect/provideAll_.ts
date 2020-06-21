import { Effect } from "./effect"
import { IProvide } from "./primitives"

/**
 * Given an environment `R`, returns a function that can supply the
 * environment to programs that require it, removing their need for any
 * specific environment.
 *
 * This is similar to dependency injection, and the `provide` function can be
 * thought of as `inject`.
 */
export const provideAll_ = <S, R, E, A>(
  next: Effect<S, R, E, A>,
  r: R
): Effect<S, unknown, E, A> => new IProvide(r, next)
