import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import type { HasScope, Scope } from "../definition"

/**
 * Uses the scope by providing it to an `Effect` workflow that needs a scope,
 * guaranteeing that the scope is closed with the result of that workflow as
 * soon as the workflow completes execution, whether by success, failure, or
 * interruption.
 *
 * @tsplus fluent ets/Scope/Closeable use
 */
export function use_<R, E, A>(
  self: Scope.Closeable,
  effect: LazyArg<Effect<R & HasScope, E, A>>
): Effect<R, E, A> {
  return self.extend(effect).onExit((exit) => self.close(exit))
}

/**
 * Uses the scope by providing it to an `Effect` workflow that needs a scope,
 * guaranteeing that the scope is closed with the result of that workflow as
 * soon as the workflow completes execution, whether by success, failure, or
 * interruption.
 */
export const use = Pipeable(use_)
