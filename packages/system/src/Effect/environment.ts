// ets_tracing: off

import { access } from "./core"

/**
 * Access environment
 */
export function environment<R>(__trace?: string) {
  return access((_: R) => _, __trace)
}
