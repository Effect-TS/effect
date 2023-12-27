import * as Data from "effect/Data"
import type * as WorkerError_ from "../WorkerError.js"

/** @internal */
export const WorkerErrorTypeId: WorkerError_.WorkerErrorTypeId = Symbol.for(
  "@effect-ts/platform/Worker/WorkerError"
) as WorkerError_.WorkerErrorTypeId

/** @internal */
export const WorkerError = (
  reason: WorkerError_.WorkerError["reason"],
  error: unknown,
  stack?: string
): WorkerError_.WorkerError =>
  Data.struct({
    [WorkerErrorTypeId]: WorkerErrorTypeId,
    _tag: "WorkerError",
    reason,
    error,
    stack
  })
