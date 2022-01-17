import type { FiberId } from "../../FiberId"
import type { UIO } from "../definition"
import { descriptor } from "./descriptor"
import { map_ } from "./map"

/**
 * Returns the `FiberId` of the fiber executing the effect that calls this
 * method.
 */
export const fiberId: UIO<FiberId> = map_(descriptor, (_) => _.id)
