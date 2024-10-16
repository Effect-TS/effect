/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
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
 * @category predicates
 */
export const isWorkerError = (u: unknown): u is WorkerError => Predicate.hasProperty(u, WorkerErrorTypeId)

/**
 * @since 1.0.0
 * @category errors
 */
export class WorkerError extends Schema.TaggedError<WorkerError>()("WorkerError", {
  reason: Schema.Literal("spawn", "decode", "send", "unknown", "encode"),
  cause: Schema.Defect
}) {
  /**
   * @since 1.0.0
   */
  readonly [WorkerErrorTypeId]: WorkerErrorTypeId = WorkerErrorTypeId

  /**
   * @since 1.0.0
   */
  static readonly Cause: Schema.Schema<
    Cause.Cause<WorkerError>,
    Schema.CauseEncoded<WorkerErrorFrom, unknown>
  > = Schema.Cause({ error: this, defect: Schema.Defect })

  /**
   * @since 1.0.0
   */
  static readonly encodeCause: (a: Cause.Cause<WorkerError>) => Schema.CauseEncoded<WorkerErrorFrom, unknown> = Schema
    .encodeSync(this.Cause)

  /**
   * @since 1.0.0
   */
  static readonly decodeCause: (u: Schema.CauseEncoded<WorkerErrorFrom, unknown>) => Cause.Cause<WorkerError> = Schema
    .decodeSync(this.Cause)

  /**
   * @since 1.0.0
   */
  get message(): string {
    switch (this.reason) {
      case "send":
        return "An error occurred calling .postMessage"
      case "spawn":
        return "An error occurred while spawning a worker"
      case "decode":
        return "An error occurred during decoding"
      case "encode":
        return "An error occurred during encoding"
      case "unknown":
        return "An unexpected error occurred"
    }
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export interface WorkerErrorFrom {
  readonly _tag: "WorkerError"
  readonly reason: "spawn" | "decode" | "send" | "unknown" | "encode"
  readonly cause: unknown
}
