// ets_tracing: off

import { map_ } from "../core.js"
import * as T from "../deps-core.js"
import { makeExit_ } from "../makeExit.js"
import type { Managed } from "../managed.js"
import { scope } from "./api.js"

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
        makeExit_(T.succeed(res), (_, exit) => release(exit))
      )
)
