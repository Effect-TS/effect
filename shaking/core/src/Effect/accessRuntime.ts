import { identity } from "../Function"
import { IAccessRuntime } from "../Support/Common"
import { Sync } from "../Support/Common/effect"
import { Runtime } from "../Support/Runtime"

/**
 * Get the runtime of the current fiber
 */
export const accessRuntime: Sync<Runtime> = new IAccessRuntime(identity) as any
