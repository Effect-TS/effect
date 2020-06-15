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
export const provide = <R>(r: R) => <S, E, A>(
  next: Effect<S, R, E, A>
): Effect<S, unknown, E, A> => new IProvide(r, next)
