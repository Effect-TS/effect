import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import * as Option from "@fp-ts/data/Option"

/**
 * End-of-stream marker.
 *
 * @tsplus static effect/core/stream/Take.Ops end
 * @category constructors
 * @since 1.0.0
 */
export const end: Take<never, never> = new TakeInternal(Exit.fail(Option.none))
