/**
 * Failures reported by native Redis clients.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Data from "../Data.ts"

/**
 * Identifies connection, protocol, routing, and command failures.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Reason = "Connection" | "Protocol" | "Server" | "Decode" | "Routing" | "Capacity" | "Closed" | "Timeout"

/**
 * Redis failure with an optional server code and transmission outcome.
 *
 * **Details**
 *
 * `Unknown` means a command may have executed before the connection failed.
 * Retrying that command can repeat its effects. `NotSent` means submission
 * did not occur. Server errors preserve their Redis error code.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class RedisError extends Data.TaggedError("RedisError")<{
  readonly reason: Reason
  readonly message: string
  readonly cause?: unknown
  readonly code?: string | undefined
  readonly outcome?: "NotSent" | "Unknown" | undefined
}> {}
