// ets_tracing: off

import type { RIO } from "./effect.js"

/**
 * Canceler Definition
 */
export type Canceler<R> = RIO<R, void>
