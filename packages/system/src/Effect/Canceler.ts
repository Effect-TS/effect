// ets_tracing: off

import type { RIO } from "./effect"

/**
 * Canceler Definition
 */
export type Canceler<R> = RIO<R, void>
