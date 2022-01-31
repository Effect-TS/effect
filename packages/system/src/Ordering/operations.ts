// ets_tracing: off

import type { Ordering } from "./definition.js"

/**
 * `number` => `Ordering`
 */
export function sign(n: number): Ordering {
  if (n < 0) {
    return -1
  }
  if (n > 0) {
    return 1
  }
  return 0
}

/**
 * Invert Ordering
 */
export function invert(O: Ordering): Ordering {
  switch (O) {
    case -1:
      return 1
    case 1:
      return -1
    default:
      return 0
  }
}

export function combine(x: Ordering, y: Ordering) {
  return x !== 0 ? x : y
}
