// ets_tracing: off

import type { Stream } from "./definitions"
import { succeed } from "./succeed.js"

/**
 * A stream that contains a single `Unit` value.
 */
export const unit: Stream<unknown, never, void> = succeed(undefined)
