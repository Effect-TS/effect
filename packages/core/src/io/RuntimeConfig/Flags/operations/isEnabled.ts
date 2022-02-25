import type { RuntimeConfigFlag } from "../../Flag"
import type { RuntimeConfigFlags } from "../definition"

/**
 * @tsplus fluent ets/RuntimeConfigFlags isEnabled
 */
export function isEnabled_(self: RuntimeConfigFlags, flag: RuntimeConfigFlag): boolean {
  return self.flags.has(flag)
}

/**
 * @ets_data_first isEnabled_
 */
export function isEnabled(flag: RuntimeConfigFlag) {
  return (self: RuntimeConfigFlags): boolean => self.isEnabled(flag)
}
