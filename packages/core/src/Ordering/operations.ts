import type { Ordering } from "@effect-ts/system/Ordering"

import * as A from "../Associative/makeAssociative"
import * as I from "../Identity/makeIdentity"

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
