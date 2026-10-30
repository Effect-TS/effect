/**
 * Errors used by `McpServer` and the MCP protocol: JSON-RPC error objects and
 * their codes, and failures of server-initiated requests to the client.
 *
 * @stability unstable
 * @since 4.1.1
 */
import * as Data from "../Data.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import * as SchemaGetter from "../SchemaGetter.ts"
import type { ProtocolVersion } from "./McpProtocol.ts"

const optional = <S extends Schema.Constraint>(
  schema: S
): Schema.decodeTo<Schema.toType<Schema.optional<S>>, Schema.optionalKey<S>> =>
  Schema.optionalKey(schema).pipe(
    Schema.decodeTo(Schema.toType(Schema.optional(schema)), {
      decode: SchemaGetter.passthrough(),
      encode: SchemaGetter.transformOptional(Option.flatMap(Option.fromUndefinedOr))
    })
  )

// =============================================================================
// JSON-RPC errors
// =============================================================================

/**
 * Schema for MCP and JSON-RPC error objects.
 *
 * **Details**
 *
 * It contains the numeric error `code`, a concise `message`, and optional
 * sender-defined `data`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.1
 */
export class McpErrorBase extends Schema.Class<McpErrorBase>(
  "@effect/ai/McpSchema/McpErrorBase"
)({
  /**
   * The error type that occurred.
   */
  code: Schema.Int,
  /**
   * A short description of the error. The message SHOULD be limited to a
   * concise single sentence.
   */
  message: Schema.String,
  /**
   * Additional information about the error. The value of this member is
   * defined by the sender (e.g. detailed error information, nested errors etc.).
   */
  data: optional(Schema.Any)
}) {}

/**
 * Represents the JSON-RPC error code for requests that are not valid request objects.
 *
 * **When to use**
 *
 * Use when building an MCP/JSON-RPC error response for a syntactically parsed
 * request object that fails request-shape validation.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.1
 */
export const INVALID_REQUEST_ERROR_CODE = -32600 as const
/**
 * Represents the JSON-RPC error code for requests whose method does not exist or is not
 * available.
 *
 * **When to use**
 *
 * Use when building an MCP/JSON-RPC error response for a request whose
 * `method` is unknown or unavailable.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.1
 */
export const METHOD_NOT_FOUND_ERROR_CODE = -32601 as const
/**
 * Represents the JSON-RPC error code for invalid method parameters.
 *
 * **When to use**
 *
 * Use when building an MCP/JSON-RPC error response for decoded request
 * parameters that fail method-specific validation.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.1
 */
export const INVALID_PARAMS_ERROR_CODE = -32602 as const
/**
 * Represents the JSON-RPC error code for internal server errors.
 *
 * **When to use**
 *
 * Use when building an MCP/JSON-RPC error response for an unexpected
 * server-side failure.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.1
 */
export const INTERNAL_ERROR_CODE = -32603 as const
/**
 * Represents the JSON-RPC error code for invalid JSON that could not be parsed.
 *
 * **When to use**
 *
 * Use when building an MCP/JSON-RPC error response before a request object is
 * available because the JSON payload could not be parsed.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.1
 */
export const PARSE_ERROR_CODE = -32700 as const

/**
 * Represents the MCP error code for HTTP headers that do not match the
 * corresponding request values.
 *
 * **When to use**
 *
 * Use when building an MCP error response for missing, malformed, or
 * mismatched request-routing headers.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.1
 */
export const HEADER_MISMATCH_ERROR_CODE = -32020 as const

/**
 * Represents the MCP error code returned when a server does not support the
 * protocol version requested by a client.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.1
 */
export const UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE = -32022 as const

/**
 * Represents an MCP/JSON-RPC error for invalid JSON that could not be parsed.
 *
 * **When to use**
 *
 * Use to report a JSON parse failure before a valid JSON-RPC request object is
 * available.
 *
 * **Details**
 *
 * Uses the standard JSON-RPC parse error code `-32700`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export class ParseError extends Schema.Error<ParseError>("effect/ai/McpSchema/ParseError")({
  ...McpErrorBase.fields,
  _tag: Schema.tag("ParseError"),
  code: Schema.tag(PARSE_ERROR_CODE)
}) {}

/**
 * Represents an MCP/JSON-RPC error for a request object that is not valid.
 *
 * **When to use**
 *
 * Use to report a syntactically parsed JSON-RPC request that is not a valid
 * request object.
 *
 * **Details**
 *
 * Uses the standard JSON-RPC invalid request code `-32600`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export class InvalidRequest extends Schema.Error<InvalidRequest>("effect/ai/McpSchema/InvalidRequest")({
  ...McpErrorBase.fields,
  _tag: Schema.tag("InvalidRequest"),
  code: Schema.tag(INVALID_REQUEST_ERROR_CODE)
}) {}

/**
 * Represents an MCP/JSON-RPC error for an unavailable method.
 *
 * **When to use**
 *
 * Use to report a JSON-RPC method that does not exist or is not available.
 *
 * **Details**
 *
 * Uses the standard JSON-RPC method-not-found code `-32601`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export class MethodNotFound extends Schema.Error<MethodNotFound>("effect/ai/McpSchema/MethodNotFound")({
  ...McpErrorBase.fields,
  _tag: Schema.tag("MethodNotFound"),
  code: Schema.tag(METHOD_NOT_FOUND_ERROR_CODE)
}) {}

/**
 * Represents an MCP/JSON-RPC error for invalid method parameters.
 *
 * **When to use**
 *
 * Use to report a request whose method parameters do not match the method
 * schema.
 *
 * **Details**
 *
 * Uses the standard JSON-RPC invalid params code `-32602`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export class InvalidParams extends Schema.Error<InvalidParams>("effect/ai/McpSchema/InvalidParams")({
  ...McpErrorBase.fields,
  _tag: Schema.tag("InvalidParams"),
  code: Schema.tag(INVALID_PARAMS_ERROR_CODE)
}) {}

/**
 * Represents an MCP/JSON-RPC error for unexpected internal server failures.
 *
 * **When to use**
 *
 * Use to report an unexpected server-side failure while handling a valid
 * request.
 *
 * **Details**
 *
 * Uses the standard JSON-RPC internal error code `-32603` and includes
 * `InternalError.notImplemented` for unimplemented handlers.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export class InternalError extends Schema.Error<InternalError>("effect/ai/McpSchema/InternalError")({
  ...McpErrorBase.fields,
  _tag: Schema.tag("InternalError"),
  code: Schema.tag(INTERNAL_ERROR_CODE)
}) {
  static readonly notImplemented = new InternalError({ message: "Not implemented" })
}

/**
 * Schema for MCP protocol errors returned in JSON-RPC failure responses,
 * including standard protocol errors and custom `McpErrorBase` values.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export const McpError = Schema.Union([
  ParseError,
  InvalidRequest,
  MethodNotFound,
  InvalidParams,
  InternalError,
  McpErrorBase
])

/**
 * Type represented by the MCP protocol error schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.1
 */
export type McpError = typeof McpError.Type

// =============================================================================
// Server-initiated requests
// =============================================================================

/**
 * Raised when the negotiated MCP revision or client capabilities do not
 * support a server-initiated operation.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export class McpReverseOperationUnsupported extends Data.TaggedError("McpReverseOperationUnsupported")<{
  readonly operation: "roots/list" | "sampling/createMessage" | "elicitation/create"
  readonly protocolVersion: ProtocolVersion
  readonly reason: string
}> {}

/**
 * A reverse MCP operation failed while being sent or projected through a
 * version adapter.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.1
 */
export class McpReverseOperationError extends Data.TaggedError("McpReverseOperationError")<{
  readonly operation: "roots/list" | "sampling/createMessage" | "elicitation/create"
  readonly cause: unknown
}> {}
