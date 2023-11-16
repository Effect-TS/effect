/**
 * @since 1.0.0
 */
import type * as Data from "effect/Data"
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
export interface WorkerError extends Data.Case {
  readonly [WorkerErrorTypeId]: WorkerErrorTypeId
  readonly _tag: "WorkerError"
  readonly reason: "spawn" | "decode" | "send" | "unknown"
  readonly error: unknown
  readonly stack?: string
}

/**
 * @since 1.0.0
 * @category errors
 */
export const WorkerError: (
  reason: "spawn" | "decode" | "send" | "unknown",
  error: unknown,
  stack?: string
) => WorkerError = internal.WorkerError
