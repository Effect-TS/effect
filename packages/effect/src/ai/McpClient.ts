/**
 * Connects to MCP servers with scoped Effect clients.
 *
 * Clients discover tools, prompts and resources using the protocol revision selected by their transport.
 * `callTool` preserves tool-reported errors as results; supplying a schema fails with
 * reason `ToolError` and retains the original result. Transport and protocol failures
 * fail the Effect. Initial discovery can retry one rejection of the selected revision.
 * Interactive server requests, subscriptions, OAuth, and general retries are not included.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as ByteSize from "../ByteSize.ts"
import type * as Cause from "../Cause.ts"
import type * as Context from "../Context.ts"
import type * as Duration from "../Duration.ts"
import type * as Effect from "../Effect.ts"
import type * as HttpClient from "../http/HttpClient.ts"
import type * as Layer from "../Layer.ts"
import type { Pipeable } from "../Pipeable.ts"
import type * as ChildProcess from "../process/ChildProcess.ts"
import type { ChildProcessSpawner } from "../process/ChildProcessSpawner.ts"
import type * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import * as internal from "./internal/mcpClient.ts"
import * as models from "./internal/mcpClientModels.ts"
import type * as McpProtocol from "./McpProtocol.ts"
import type * as McpSchema from "./McpSchema.ts"
import type * as Tool from "./Tool.ts"
import type * as Toolkit from "./Toolkit.ts"

/**
 * Schema for the tagged reasons carried by an `McpClientError`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const McpClientErrorReason = models.McpClientErrorReason
/**
 * Union of MCP client and transport failure reasons.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type McpClientErrorReason = typeof McpClientErrorReason.Type

/**
 * Error wrapping a tagged MCP client or transport failure reason.
 *
 * **Details**
 *
 * Use `Effect.catchReason` or `Effect.catchReasons` to recover from selected
 * reasons. The constructor accepts plain tagged reason objects.
 * `Effect.unwrapReason` promotes the reason into the error channel.
 * `ToolError.result` retains the complete decoded tool result.
 *
 * **Example** (Recovering from a deadline failure)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { McpClient } from "effect/ai"
 *
 * const operation = Effect.fail(new McpClient.McpClientError({
 *   reason: { _tag: "TimeoutError", message: "MCP operation deadline exceeded" }
 * }))
 * const recovered = operation.pipe(
 *   Effect.catchReason("McpClientError", "TimeoutError", () => Effect.succeed("deferred"))
 * )
 *
 * await Effect.runPromise(recovered) // => "deferred"
 * ```
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export const McpClientError: Schema.Class<
  McpClientError,
  Schema.TaggedStruct<"McpClientError", { readonly reason: typeof McpClientErrorReason }>,
  McpClientError
> = models.McpClientError

/**
 * Error carrying a tagged MCP client or transport failure reason.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export interface McpClientError extends Cause.YieldableError {
  readonly _tag: "McpClientError"
  readonly reason: McpClientErrorReason
  readonly cause: McpClientErrorReason
}
/**
 * Supported MCP wire protocol revisions.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type ProtocolVersion = "2025-11-25" | "2026-07-28"

/**
 * Service supplied by the built-in MCP transport constructors and layers.
 *
 * **Details**
 *
 * Transport construction owns cleanup through its Effect scope.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const Transport: Context.ServiceClass<Transport, "effect/ai/McpClient/Transport", Transport["Service"]> =
  models.Transport

/**
 * Type of the Transport service tag.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface Transport extends
  Context.ServiceClass.Shape<"effect/ai/McpClient/Transport", {
    readonly "~effect/ai/McpClient/Transport": "~effect/ai/McpClient/Transport"
  }>
{}
/**
 * Starts a scoped subprocess using newline-delimited JSON-RPC.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const stdio: (options: {
  readonly command: ChildProcess.Command
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly maxMessageBytes?: ByteSize.Input | undefined
}) => Effect.Effect<Transport["Service"], McpClientError, ChildProcessSpawner | Scope.Scope> = internal.stdio

/**
 * Creates a Streamable HTTP transport with request-owned JSON or SSE responses.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const http: (options: {
  readonly url: string | URL
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly maxMessageBytes?: ByteSize.Input | undefined
}) => Effect.Effect<Transport["Service"], McpClientError, HttpClient.HttpClient | Scope.Scope> = internal.http

/**
 * Provides a connected MCP client over stdio using the child process spawner.
 *
 * **Details**
 *
 * The layer scope owns the client and subprocess. Supply `clientInfo` and optional
 * `timeout` together with the stdio transport options.
 *
 * @see {@link layerHttp}
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerStdio: (options: Options & Parameters<typeof stdio>[0]) => Layer.Layer<
  McpClient,
  McpClientError,
  ChildProcessSpawner
> = internal.layerStdio

/**
 * Provides a connected MCP client over Streamable HTTP using the HTTP client.
 *
 * **Details**
 *
 * The layer scope owns the client and connection. Supply `clientInfo` and optional
 * `timeout` together with the HTTP transport options.
 *
 * **Example** (Providing an HTTP client connection)
 *
 * ```ts import.meta.vitest
 * import { Layer } from "effect"
 * import { McpClient, McpProtocol } from "effect/ai"
 * import { FetchHttpClient } from "effect/http"
 *
 * const ClientLayer = McpClient.layerHttp({
 *   clientInfo: { name: "report-workflow", version: "1.0.0" },
 *   protocol: McpProtocol.v2026_07_28,
 *   url: "http://localhost:3000/mcp"
 * }).pipe(Layer.provide(FetchHttpClient.layer))
 * ```
 *
 * @see {@link layerStdio}
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerHttp: (options: Options & Parameters<typeof http>[0]) => Layer.Layer<
  McpClient,
  McpClientError,
  HttpClient.HttpClient
> = internal.layerHttp

/**
 * Discovers remote tools and binds their handlers using the standard Toolkit implementation.
 *
 * **Details**
 *
 * Pass an optional prefix such as `"reports__"` to qualify model tool names.
 * Remote JSON Schemas are advertised without local schema import. Results become
 * text; tool-reported and operational failures fail the Effect. Use `Tool.make`
 * or `Tool.dynamic` with `Toolkit.make` for custom validation, approval or results.
 * Build a new toolkit to discover changes between model turns.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const toolkit: (client: Client, prefix?: string) => Effect.Effect<
  Toolkit.WithHandler<
    Record<
      string,
      Tool.Tool<string, {
        readonly parameters: typeof Schema.Unknown
        readonly success: typeof Schema.String
        readonly failure: typeof McpClientError
        readonly failureMode: "error"
      }>
    >
  >,
  McpClientError
> = internal.toolkit

/**
 * Returns whether a value is an MCP client.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isClient: (value: unknown) => value is Client = internal.isClient

/**
 * Identity and default deadline for a scoped tool client.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Options {
  readonly clientInfo: McpSchema.Implementation
  readonly timeout?: Duration.Input
}

/**
 * Per-operation deadline override covering admission and result decoding.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface CallOptions {
  readonly timeout?: Duration.Input
}

/**
 * Tool invocation carrying its discovered definition for HTTP routing.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CallToolParams<S extends Schema.Top = never> {
  readonly tool: McpSchema.Tool
  readonly schema?: S | undefined
  readonly arguments?: typeof McpSchema.CallTool.payloadSchema.Type["arguments"]
}

/**
 * Prompt invocation carrying its discovered definition and string arguments.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface GetPromptParams {
  readonly prompt: McpSchema.Prompt
  readonly arguments?: typeof McpSchema.GetPrompt.payloadSchema.Type["arguments"]
}

/**
 * Resource URI to read from the server.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ReadResourceParams {
  readonly uri: string
}

/**
 * A scoped connection to one MCP server.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Client extends Pipeable {
  readonly [internal.TypeId]: typeof internal.TypeId
  readonly protocolVersion: ProtocolVersion
  readonly serverInfo: McpSchema.Implementation | undefined
  readonly instructions?: string | undefined
  /** Returns every tool page as one snapshot, bounded by the deadline, 100 pages and 10,000 tools. */
  readonly listTools: (options?: CallOptions) => Effect.Effect<ReadonlyArray<McpSchema.Tool>, McpClientError>
  /** Returns all prompt pages as one bounded snapshot. */
  readonly listPrompts: (options?: CallOptions) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  /** Gets the messages for a discovered prompt. */
  readonly getPrompt: (
    params: GetPromptParams,
    options?: CallOptions
  ) => Effect.Effect<McpSchema.GetPromptResult, McpClientError>
  /** Returns all resource pages as one bounded snapshot. */
  readonly listResources: (options?: CallOptions) => Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
  /** Reads the complete contents of a resource URI. */
  readonly readResource: (
    params: ReadResourceParams,
    options?: CallOptions
  ) => Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
  /** Calls a discovered tool, optionally decoding with a schema. Errors retain the full result. */
  readonly callTool: {
    (params: CallToolParams, options?: CallOptions): Effect.Effect<McpSchema.CallToolResult, McpClientError>
    <S extends Schema.Top>(
      params: CallToolParams<S> & { readonly schema: S },
      options?: CallOptions
    ): Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
    <S extends Schema.Top = never>(
      params: CallToolParams<S>,
      options?: CallOptions
    ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
  }
}

/**
 * Calls a discovered tool and returns the full result, or decodes structured content
 * using the optional schema. With a schema, tool-reported errors fail before decoding
 * and retain the full result. Decoder services are required by the caller.
 *
 * @stability unstable
 * @category operations
 * @since 4.0.0
 */
export const callTool: {
  (
    params: CallToolParams,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.CallToolResult, McpClientError>
  (self: Client, params: CallToolParams, options?: CallOptions): Effect.Effect<McpSchema.CallToolResult, McpClientError>
  <S extends Schema.Top>(
    params: CallToolParams<S> & { readonly schema: S },
    options?: CallOptions
  ): (self: Client) => Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top = never>(
    params: CallToolParams<S>,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top>(
    self: Client,
    params: CallToolParams<S> & { readonly schema: S },
    options?: CallOptions
  ): Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top = never>(
    self: Client,
    params: CallToolParams<S>,
    options?: CallOptions
  ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
} = internal.callTool

/**
 * Returns all prompt pages as one bounded snapshot.
 *
 * @stability unstable
 * @category operations
 * @since 4.0.0
 */
export const listPrompts: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
} = internal.listPrompts

/**
 * Gets the messages for a discovered prompt.
 *
 * @stability unstable
 * @category operations
 * @since 4.0.0
 */
export const getPrompt: {
  (
    params: GetPromptParams,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.GetPromptResult, McpClientError>
  (
    self: Client,
    params: GetPromptParams,
    options?: CallOptions
  ): Effect.Effect<McpSchema.GetPromptResult, McpClientError>
} = internal.getPrompt

/**
 * Returns all resource pages as one bounded snapshot.
 *
 * @stability unstable
 * @category operations
 * @since 4.0.0
 */
export const listResources: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
} = internal.listResources

/**
 * Reads the complete contents of a resource URI.
 *
 * @stability unstable
 * @category operations
 * @since 4.0.0
 */
export const readResource: {
  (
    params: ReadResourceParams,
    options?: CallOptions
  ): (self: Client) => Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
  (
    self: Client,
    params: ReadResourceParams,
    options?: CallOptions
  ): Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
} = internal.readResource

/**
 * Service tag for applications that provide one default MCP connection.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const McpClient: Context.ServiceClass<McpClient, "effect/ai/McpClient", Client> = models.McpClient

/**
 * Type of the McpClient service tag.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface McpClient extends Context.ServiceClass.Shape<"effect/ai/McpClient", Client> {}
/**
 * Constructs and connects a client using the supplied MCP transport service and its protocol adapter.
 *
 * **Details**
 *
 * Operations default to a 60-second total deadline and 64 concurrent calls.
 * The initialization handshake and complete tools discovery each share the
 * configured timeout. Structured result decoding uses the caller's services
 * and deadline, after releasing the call permit.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make: (options: Options) => Effect.Effect<
  Client,
  McpClientError,
  Scope.Scope | Transport
> = internal.make
