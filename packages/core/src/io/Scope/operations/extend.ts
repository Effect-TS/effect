import type { LazyArg } from "../../../data/Function"
import { mergeEnvironments } from "../../../data/Has"
import { Effect } from "../../Effect"
import type { Scope } from "../definition"
import { HasScope } from "../definition"

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
  return Effect.suspendSucceed(
    effect().provideSomeEnvironment((r: R) => mergeEnvironments(HasScope, r, self))
  )
}

/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 */
export const extend = Pipeable(extend_)
