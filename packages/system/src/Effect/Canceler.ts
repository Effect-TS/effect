import type { AsyncR } from "./effect"

/**
 * Canceler Definition
 */
export type Canceler<R> = AsyncR<R, void>
