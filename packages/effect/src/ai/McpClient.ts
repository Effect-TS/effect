/**
 * Connects to MCP servers with scoped Effect clients.
 *
 * Clients discover tools, prompts and resources using the protocol revision selected by
 * their transport. `callTool` returns tool-reported errors as results; supplying a schema
 * turns them into a `ToolError` reason that retains the original result. Transport and
 * protocol failures fail the Effect. Interactive server requests, subscriptions, OAuth
 * and retries are not included.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as ByteSize from "../ByteSize.ts"
import type * as Cause from "../Cause.ts"
import type * as Context from "../Context.ts"
import type * as Duration from "../Duration.ts"
import type * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
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
 * reasons. A `ToolError` reason retains the complete tool result.
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
 * Per-operation deadline override. Defaults to `Options.timeout`.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface CallOptions {
  readonly timeout?: Duration.Input
}

/**
 * Tool invocation carrying the discovered definition, which supplies the
 * request name and, over modern HTTP, the header routing annotations.
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
  /** Returns every prompt page as one snapshot with the same bounds as `listTools`. */
  readonly listPrompts: (options?: CallOptions) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  /** Gets the messages for a discovered prompt. */
  readonly getPrompt: (
    params: GetPromptParams,
    options?: CallOptions
  ) => Effect.Effect<McpSchema.GetPromptResult, McpClientError>
  /** Returns every resource page as one snapshot with the same bounds as `listTools`. */
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
} = dual(
  (args) => isClient(args[0]),
  <S extends Schema.Top>(self: Client, params: CallToolParams<S>, options?: CallOptions) =>
    self.callTool(params, options)
)

/**
 * Returns every prompt page as one snapshot with the same bounds as `listTools`.
 *
 * @stability unstable
 * @category operations
 * @since 4.0.0
 */
export const listPrompts: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
} = dual((args) => isClient(args[0]), (self: Client, options?: CallOptions) => self.listPrompts(options))

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
} = dual(
  (args) => isClient(args[0]),
  (self: Client, params: GetPromptParams, options?: CallOptions) => self.getPrompt(params, options)
)

/**
 * Returns every resource page as one snapshot with the same bounds as `listTools`.
 *
 * @stability unstable
 * @category operations
 * @since 4.0.0
 */
export const listResources: {
  (options?: CallOptions): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
  (self: Client, options?: CallOptions): Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
} = dual((args) => isClient(args[0]), (self: Client, options?: CallOptions) => self.listResources(options))

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
} = dual(
  (args) => isClient(args[0]),
  (self: Client, params: ReadResourceParams, options?: CallOptions) => self.readResource(params, options)
)

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
 * Every operation, including initialization and each complete discovery, runs
 * under one deadline that defaults to 60 seconds and can be overridden per call.
 * Schema decoding requires the schema's services from the caller.
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
