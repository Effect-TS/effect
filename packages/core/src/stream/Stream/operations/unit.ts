import { constVoid } from "../../../data/Function"
import { Stream } from "../definition"

/**
 * Returns a stream that contains a single `undefined` value.
 *
 * @tsplus static ets/StreamOps unit
 */
export const unit: Stream<unknown, never, void> = Stream.succeed(constVoid)
