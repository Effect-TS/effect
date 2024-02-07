/**
 * @since 1.0.0
 */
import * as internal from "./internal/workerError.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const WorkerErrorTypeId: unique symbol = internal.WorkerErrorTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type WorkerErrorTypeId = typeof WorkerErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export interface WorkerError {
  readonly [WorkerErrorTypeId]: WorkerErrorTypeId
  readonly _tag: "WorkerError"
  readonly reason: "spawn" | "decode" | "send" | "unknown" | "encode"
  readonly error: unknown
  readonly stack?: string | undefined
}

/**
 * @since 1.0.0
 * @category errors
 */
export const WorkerError: (
  reason: "spawn" | "decode" | "send" | "unknown" | "encode",
  error: unknown,
  stack?: string | undefined
) => WorkerError = internal.WorkerError
