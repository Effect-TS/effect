import type { RuntimeConfigFlag } from "../../Flag"
import { RuntimeConfigFlags } from "../definition"

/**
 * @tsplus operator ets/RuntimeConfigFlags +
 * @tsplus fluent ets/RuntimeConfigFlags add
 */
export function add_(
  self: RuntimeConfigFlags,
  flag: RuntimeConfigFlag
): RuntimeConfigFlags {
  return RuntimeConfigFlags(self.flags + flag)
}

/**
 * @ets_data_first add_
 */
export function add(flag: RuntimeConfigFlag) {
  return (self: RuntimeConfigFlags): RuntimeConfigFlags => self + flag
}
