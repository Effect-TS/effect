import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { FiberScope } from "../../FiberScope"
import { Effect, IOverrideForkScope } from "../definition"

export class ForkScopeRestore {
  constructor(private scope: FiberScope) {}

  readonly restore = <R, E, A>(
    fa: Effect<R, E, A>,
    __tsplusTrace?: string
  ): Effect<R, E, A> =>
    new IOverrideForkScope(
      () => fa,
      () => Option.some(this.scope),
      __tsplusTrace
    )
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 *
 * @tsplus static ets/EffectOps forkScopeMask
 */
export function forkScopeMask_<R, E, A>(
  newScope: LazyArg<FiberScope>,
  f: (restore: ForkScopeRestore) => Effect<R, E, A>,
  __tsplusTrace?: string
) {
  return Effect.forkScopeWith(
    (scope) =>
      new IOverrideForkScope(
        () => f(new ForkScopeRestore(scope)),
        () => Option.some(newScope()),
        __tsplusTrace
      )
  )
}
