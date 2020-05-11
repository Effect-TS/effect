import { Ordering } from "./Ordering"

/**
 * @since 2.0.0
 */
export function sign(n: number): Ordering {
  return n <= -1 ? -1 : n >= 1 ? 1 : 0
}
