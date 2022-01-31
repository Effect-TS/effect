import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * A scope in which resources can be safely preallocated. Passing a `Managed`
 * to the method will create (inside an effect) a managed resource which
 * is already acquired and cannot fail.
 */
export interface PreallocationScope {
  <R, E, A>(managed: Managed<R, E, A>): Effect<R, E, Managed<unknown, never, A>>
}

/**
 * Creates a scope in which resources can be safely preallocated.
 *
 * @tsplus static ets/ManagedOps preallocationScope
 */
export const preallocationScope: Managed<unknown, never, PreallocationScope> =
  Managed.scope.map(
    (allocate): PreallocationScope =>
      (managed) =>
        allocate(managed).map(({ tuple: [release, res] }) =>
          Managed.acquireReleaseExitWith(Effect.succeedNow(res), (_, exit) =>
            release(exit)
          )
        )
  )
