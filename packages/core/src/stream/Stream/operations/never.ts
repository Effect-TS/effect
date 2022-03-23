import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Returns a stream that never produces any value or fails with any error.
 *
 * @tsplus static ets/StreamOps never
 */
export const never: Stream<unknown, never, never> = Stream.fromEffect(Effect.never)
