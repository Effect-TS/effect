import type { Lazy } from "./types"

/**
 * @since 2.0.0
 */
export function constant<A>(a: A): Lazy<A> {
  return () => a
}
