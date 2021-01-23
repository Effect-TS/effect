import { access } from "./core"

/**
 * Returns an effectful function that extracts out the second element of a
 * tuple.
 */
export function second<A>() {
  return access((a: [unknown, A]) => a)
}
