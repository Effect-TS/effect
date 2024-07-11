/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import * as Inspectable from "effect/Inspectable"
import * as Predicate from "effect/Predicate"
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
  error: Schema.CauseDefectUnknown
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
    Schema.CauseEncoded<WorkerErrorFrom>
  > = Schema.Cause({ error: this })

  /**
   * @since 1.0.0
   */
  static readonly encodeCause: (a: Cause.Cause<WorkerError>) => Schema.CauseEncoded<WorkerErrorFrom> = Schema
    .encodeSync(this.Cause)

  /**
   * @since 1.0.0
   */
  static readonly decodeCause: (u: Schema.CauseEncoded<WorkerErrorFrom>) => Cause.Cause<WorkerError> = Schema
    .decodeSync(this.Cause)

  /**
   * @since 1.0.0
   */
  get message() {
    const message = Predicate.hasProperty(this.error, "message")
      ? this.error.message
      : Inspectable.toStringUnknown(this.error, undefined)
    return `${this.reason}: ${message}`
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export interface WorkerErrorFrom {
  readonly _tag: "WorkerError"
  readonly reason: "spawn" | "decode" | "send" | "unknown" | "encode"
  readonly error: unknown
}
