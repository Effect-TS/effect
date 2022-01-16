// ets_tracing: off

import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { use_ } from "./use"

/**
 * Use the resource until interruption. Useful for resources that you want
 * to acquire and use as long as the application is running, like a
 * HTTP server.
 */
export function useForever<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return use_(self, () => T.never, __trace)
}
