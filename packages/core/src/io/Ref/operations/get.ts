import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Reads the value from the `XRef`.
 *
 * @tsplus fluent ets/XRef get
 */
export function get<RA, RB, EA, EB, A, B>(
  self: XRef<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): Effect<RB, EB, B> {
  // @ts-expect-error
  return concrete(self)._get
}
