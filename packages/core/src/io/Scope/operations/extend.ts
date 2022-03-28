import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import type { HasScope, Scope } from "../definition"
import { concreteScope } from "../definition"

/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 *
 * @tsplus fluent ets/Scope extend
 * @tsplus fluent ets/Scope/Closeable extend
 */
export function extend_<R, E, A>(
  self: Scope,
  effect: LazyArg<Effect<R & HasScope, E, A>>
): Effect<R, E, A> {
  concreteScope(self)
  return self._extend(effect)
}

/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 */
export const extend = Pipeable(extend_)
