import * as HS from "../../../../collection/immutable/HashSet"
import type { RuntimeConfigFlag } from "../../Flag"
import { RuntimeConfigFlags } from "../definition"

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
