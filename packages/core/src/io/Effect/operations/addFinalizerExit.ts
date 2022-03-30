import type { Exit } from "../../Exit"
import type { HasScope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * A more powerful variant of `addFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static ets/EffectOps addFinalizerExit
 */
export function addFinalizerExit<R, X>(
  finalizer: (exit: Exit<unknown, unknown>) => RIO<R, X>,
  __tsplusTrace?: string
): Effect<R & HasScope, never, void> {
  return Effect.Do()
    .bind("environment", () => Effect.environment<R>())
    .bind("scope", () => Effect.scope)
    .flatMap(({ environment, scope }) =>
      scope.addFinalizerExit((exit) => finalizer(exit).provideEnvironment(environment))
    )
}
