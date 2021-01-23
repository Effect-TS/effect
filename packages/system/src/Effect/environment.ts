import { access } from "./core"

/**
 * Access environment
 */
export function environment<R>() {
  return access((_: R) => _)
}
