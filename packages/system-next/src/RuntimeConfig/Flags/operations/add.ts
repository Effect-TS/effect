// ets_tracing: off

import * as HS from "../../../Collections/Immutable/HashSet"
import type { RuntimeConfigFlag } from "../../Flag"
import { RuntimeConfigFlags } from ".."

export function add_(
  self: RuntimeConfigFlags,
  flag: RuntimeConfigFlag
): RuntimeConfigFlags {
  return new RuntimeConfigFlags(HS.add_(self.flags, flag))
}

/**
 * @ets_data_first add_
 */
export function add(flag: RuntimeConfigFlag) {
  return (self: RuntimeConfigFlags): RuntimeConfigFlags => add_(self, flag)
}
