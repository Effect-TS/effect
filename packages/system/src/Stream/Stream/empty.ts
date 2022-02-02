// ets_tracing: off

import { succeed } from "../_internal/managed.js"
import * as Pull from "../Pull/index.js"
import type { UIO } from "./definitions.js"
import { Stream } from "./definitions.js"

/**
 * The empty stream
 */
export const empty: UIO<never> = new Stream(succeed(Pull.end))
