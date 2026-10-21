/**
 * Errors produced by `McpClient` operations and transports.
 *
 * Every failure is an `McpClientError` carrying a tagged `reason`: transport,
 * protocol, HTTP, unsupported feature, closed connection, timeout, limit,
 * configuration, validation or tool-reported errors.
 *
 * @stability experimental
 * @since 4.0.6
 */
import * as Schema from "../Schema.ts"
import * as McpSchema from "./McpSchema.ts"

/**
 * Schema for the tagged reasons carried by an `McpClientError`.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.6
 */
export const McpClientErrorReason = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("TransportError"),
    message: Schema.String,
    cause: Schema.optional(Schema.Defect())
  }),
  Schema.Struct({
    _tag: Schema.Literal("ProtocolError"),
    message: Schema.String,
    code: Schema.optional(Schema.Int),
    data: Schema.optional(Schema.Unknown),
    cause: Schema.optional(Schema.Defect())
  }),
  Schema.Struct({
    _tag: Schema.Literal("HttpError"),
    message: Schema.String,
    status: Schema.Int,
    wwwAuthenticate: Schema.optional(Schema.String),
    retryAfter: Schema.optional(Schema.String),
    code: Schema.optional(Schema.Int),
    data: Schema.optional(Schema.Unknown)
  }),
  Schema.Struct({
    _tag: Schema.Literal("UnsupportedError"),
    message: Schema.String,
    result: Schema.optional(McpSchema.CallToolResult)
  }),
  Schema.Struct({
    _tag: Schema.Literal("ClosedError"),
    message: Schema.String,
    sessionExpired: Schema.optional(Schema.Boolean)
  }),
  Schema.Struct({
    _tag: Schema.Literal("TimeoutError"),
    message: Schema.String
  }),
  Schema.Struct({
    _tag: Schema.Literal("LimitError"),
    message: Schema.String
  }),
  Schema.Struct({
    _tag: Schema.Literal("ConfigurationError"),
    message: Schema.String,
    cause: Schema.optional(Schema.Defect())
  }),
  Schema.Struct({
    _tag: Schema.Literal("ValidationError"),
    message: Schema.String,
    cause: Schema.optional(Schema.Defect())
  }),
  Schema.Struct({
    _tag: Schema.Literal("ToolError"),
    message: Schema.String,
    result: McpSchema.CallToolResult
  })
])

/**
 * Union of MCP client and transport failure reasons.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export type McpClientErrorReason = typeof McpClientErrorReason.Type

/**
 * Error wrapping a tagged MCP client or transport failure reason.
 *
 * **Details**
 *
 * Use `Effect.catchReason` or `Effect.catchReasons` to recover from selected
 * reasons. A `ToolError` reason retains the complete tool result.
 *
 * **Example** (Recovering from a deadline failure)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { McpClientError } from "effect/ai"
 *
 * const operation = Effect.fail(new McpClientError.McpClientError({
 *   reason: { _tag: "TimeoutError", message: "MCP operation deadline exceeded" }
 * }))
 * const recovered = operation.pipe(
 *   Effect.catchReason("McpClientError", "TimeoutError", () => Effect.succeed("deferred"))
 * )
 *
 * await Effect.runPromise(recovered) // => "deferred"
 * ```
 *
 * @stability experimental
 * @category errors
 * @since 4.0.6
 */
export class McpClientError extends Schema.TaggedError<McpClientError>()("McpClientError", {
  reason: McpClientErrorReason
}) {
  override readonly cause = this.reason

  override get message(): string {
    return this.reason.message
  }
}
