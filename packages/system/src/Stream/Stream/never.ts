// ets_tracing: off

import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * The stream that never produces any value or fails with any error.
 */
export const never: Stream<unknown, never, never> = new Stream(M.succeed(T.never))
