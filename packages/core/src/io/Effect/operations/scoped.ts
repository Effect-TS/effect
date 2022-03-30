import type { LazyArg } from "../../../data/Function"
import type { HasScope } from "../../Scope"
import { Scope } from "../../Scope"
import type { Effect } from "../definition"

/**
 * Scopes all resources uses in this workflow to the lifetime of the workflow,
 * ensuring that their finalizers are run as soon as this workflow completes
 * execution, whether by success, failure, or interruption.
 *
 * @tsplus static ets/EffectOps scoped
 */
export function scoped<R, E, A>(
  effect: LazyArg<Effect<R & HasScope, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Scope.make.flatMap((scope) => scope.use(effect))
}
