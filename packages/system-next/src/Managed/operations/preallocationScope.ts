// ets_tracing: off

import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"
import { map_ } from "./map"
import { scope } from "./scope"

/**
 * A scope in which resources can be safely preallocated. Passing a `Managed`
 * to the method will create (inside an effect) a managed resource which
 * is already acquired and cannot fail.
 */
export interface PreallocationScope {
  <R, E, A>(managed: Managed<R, E, A>): T.Effect<R, E, Managed<unknown, never, A>>
}

/**
 * Creates a scope in which resources can be safely preallocated.
 */
export const preallocationScope: Managed<unknown, never, PreallocationScope> = map_(
  scope,
  (allocate): PreallocationScope =>
    (managed) =>
      T.map_(allocate(managed), ({ tuple: [release, res] }) =>
        acquireReleaseExitWith_(T.succeedNow(res), (_, exit) => release(exit))
      )
)
