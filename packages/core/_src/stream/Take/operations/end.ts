import { TakeInternal } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * End-of-stream marker.
 *
 * @tsplus static ets/Take/Ops end
 */
export const end: Take<never, never> = new TakeInternal(Exit.fail(Option.none));
