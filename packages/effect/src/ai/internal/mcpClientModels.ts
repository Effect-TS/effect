/** @internal */
import * as Context from "../../Context.ts"
import type { ServiceClass } from "../../Context.ts"
import * as Schema from "../../Schema.ts"
import type * as McpClientApi from "../McpClient.ts"
import * as McpSchema from "../McpSchema.ts"

export const TransportTypeId = "~effect/ai/McpClient/Transport" as const

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

export class McpClientError extends Schema.TaggedError<McpClientError>()("McpClientError", {
  reason: McpClientErrorReason
}) {
  override readonly cause = this.reason

  override get message(): string {
    return this.reason.message
  }
}

export type Transport = McpClientApi.Transport

export const Transport: ServiceClass<
  McpClientApi.Transport,
  "effect/ai/McpClient/Transport",
  McpClientApi.Transport["Service"]
> = Context.Service<McpClientApi.Transport, McpClientApi.Transport["Service"]>()("effect/ai/McpClient/Transport")

export type McpClient = McpClientApi.McpClient

export const McpClient: ServiceClass<McpClientApi.McpClient, "effect/ai/McpClient", McpClientApi.Client> = Context
  .Service<McpClientApi.McpClient, McpClientApi.Client>()("effect/ai/McpClient")
