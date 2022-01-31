// ets_tracing: off

import * as C from "../core.js"

/**
 * Unit channel
 */
export const unit: C.Channel<unknown, unknown, unknown, unknown, never, never, void> =
  C.end(void 0)
