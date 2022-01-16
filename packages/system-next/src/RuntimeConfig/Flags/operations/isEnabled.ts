// ets_tracing: off

import * as HS from "../../../Collections/Immutable/HashSet"
import type { RuntimeConfigFlag } from "../../Flag"
import type { RuntimeConfigFlags } from ".."

export function isEnabled_(self: RuntimeConfigFlags, flag: RuntimeConfigFlag): boolean {
  return HS.has_(self.flags, flag)
}

/**
 * @ets_data_first isEnabled_
 */
export function isEnabled(flag: RuntimeConfigFlag) {
  return (self: RuntimeConfigFlags): boolean => isEnabled_(self, flag)
}
