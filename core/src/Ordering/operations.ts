import { pipe } from "@effect-ts/system/Function"

import * as A from "../Associative/makeAssociative"
import * as I from "../Identity/makeIdentity"
import { Ordering } from "./definition"

/**
 * Ordering => number
 */
export function toNumber(o: Ordering) {
  return pipe(Ordering.unwrap(o), (o) => {
    switch (o) {
      case "eq": {
        return 0
      }
      case "gt": {
        return 1
      }
      case "lt": {
        return -1
      }
    }
  })
}

/**
 * `number` => `Ordering`
 */
export function sign(n: number): Ordering {
  if (n < 0) {
    return Ordering.wrap("lt")
  }
  if (n > 0) {
    return Ordering.wrap("gt")
  }
  return Ordering.wrap("eq")
}

/**
 * Invert Ordering
 */
export function invert(O: Ordering): Ordering {
  const _ = toNumber(O)
  switch (_) {
    case -1:
      return sign(1)
    case 1:
      return sign(-1)
    default:
      return sign(0)
  }
}

/**
 * `Associative` instance for `Ordering`
 */
export const Associative: A.Associative<Ordering> = A.makeAssociative((y) => (x) =>
  x !== Ordering.wrap("eq") ? x : y
)

/**
 * `Identity` instance for `Ordering`
 */
export const Identity: I.Identity<Ordering> = I.makeIdentity(
  Ordering.wrap("eq"),
  Associative.combine
)
