import * as HS from "../../Collections/Immutable/HashSet"
import type { FiberId } from "../definition"
import { None } from "../definition"
import { combine_ } from "./combine"

/**
 * Combines a set of `FiberId`s into a single `FiberId`.
 */
export function combineAll(fiberIds: HS.HashSet<FiberId>): FiberId {
  return HS.reduce_(fiberIds, new None(), combine_)
}
