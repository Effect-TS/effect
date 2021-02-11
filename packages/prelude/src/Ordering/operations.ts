import * as A from "../Associative/makeAssociative"
import * as I from "../Identity/makeIdentity"
import type { Ordering } from "./definition"

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

/**
 * `Associative` instance for `Ordering`
 */
export const Associative: A.Associative<Ordering> = A.makeAssociative((y) => (x) =>
  x !== 0 ? x : y
)

/**
 * `Identity` instance for `Ordering`
 */
export const Identity: I.Identity<Ordering> = I.makeIdentity(0, Associative.combine)
