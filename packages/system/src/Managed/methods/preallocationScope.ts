import { map_ } from "../core"
import * as T from "../deps-core"
import { makeExit_ } from "../makeExit"
import type { Managed } from "../managed"
import { scope } from "./api"

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
  (allocate): PreallocationScope => (managed) =>
    T.map_(allocate(managed), ([release, res]) =>
      makeExit_(T.succeed(res), (_, exit) => release(exit))
    )
)
