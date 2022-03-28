import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import type { CloseableScope, HasScope } from "../definition"
import { concreteCloseableScope } from "../definition"

/**
 * Uses the scope by providing it to an `Effect` workflow that needs a scope,
 * guaranteeing that the scope is closed with the result of that workflow as
 * soon as the workflow completes execution, whether by success, failure, or
 * interruption.
 *
 * @tsplus fluent ets/Scope/Closeable use
 */
export function use_<R, E, A>(
  self: CloseableScope,
  effect: LazyArg<Effect<R & HasScope, E, A>>
): Effect<R, E, A> {
  concreteCloseableScope(self)
  return self._use(effect)
}

/**
 * Uses the scope by providing it to an `Effect` workflow that needs a scope,
 * guaranteeing that the scope is closed with the result of that workflow as
 * soon as the workflow completes execution, whether by success, failure, or
 * interruption.
 */
export const use = Pipeable(use_)
