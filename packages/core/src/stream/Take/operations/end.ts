import { Option } from "../../../data/Option"
import { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * End-of-stream marker.
 *
 * @tsplus static ets/TakeOps end
 */
export const end: Take<never, never> = new TakeInternal(Exit.fail(Option.none))
