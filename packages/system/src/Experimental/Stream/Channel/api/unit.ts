// ets_tracing: off

import * as C from "../core"

/**
 * Unit channel
 */
export const unit: C.Channel<unknown, unknown, unknown, unknown, never, never, void> =
  C.end(void 0)
