import type { HashSet } from "../../../collection/immutable/HashSet"
import type { RuntimeConfigFlag } from "../Flag"

/**
 * @tsplus type ets/RuntimeConfigFlags
 */
export interface RuntimeConfigFlags {
  readonly flags: HashSet<RuntimeConfigFlag>
}

/**
 * @tsplus type ets/RuntimeConfigFlagsOps
 */
export interface RuntimeConfigFlagsOps {}
export const RuntimeConfigFlags: RuntimeConfigFlagsOps = {}

/**
 * @tsplus static ets/RuntimeConfigFlagsOps __call
 */
export function apply(flags: HashSet<RuntimeConfigFlag>): RuntimeConfigFlags {
  return { flags }
}
