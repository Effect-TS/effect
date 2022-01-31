// ets_tracing: off

import type { Ordering } from "@effect-ts/system/Ordering"

import * as A from "../Associative/makeAssociative.js"
import * as I from "../Identity/makeIdentity.js"

/**
 * `Associative` instance for `Ordering`
 */
export const Associative: A.Associative<Ordering> = A.makeAssociative((x, y) =>
  x !== 0 ? x : y
)

/**
 * `Identity` instance for `Ordering`
 */
export const Identity: I.Identity<Ordering> = I.makeIdentity(0, Associative.combine)
