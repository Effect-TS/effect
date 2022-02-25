import { HashSet } from "../../../../collection/immutable/HashSet"
import { RuntimeConfigFlags } from "../definition"

/**
 * @tsplus static ets/RuntimeConfigFlagsOps empty
 */
export const empty: RuntimeConfigFlags = RuntimeConfigFlags(HashSet())
