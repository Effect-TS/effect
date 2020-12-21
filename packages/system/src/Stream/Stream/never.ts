import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * The stream that never produces any value or fails with any error.
 */
export const never: Stream<unknown, never, never> = new Stream(M.succeed(T.never))
