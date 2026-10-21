/**
 * Connects to MCP servers with scoped Effect clients.
 *
 * Clients discover tools, prompts and resources using the protocol revision selected by
 * their transport. `callTool` returns tool-reported errors as results; supplying a schema
 * turns them into a `ToolError` reason that retains the original result. Transport and
 * protocol failures fail the Effect. Interactive server requests, subscriptions, OAuth
 * and retries are not included.
 *
 * @stability experimental
 * @since 4.0.6
 */
import type * as ByteSize from "../ByteSize.ts"
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
import type { McpClientError } from "./McpClientError.ts"
import type * as McpProtocol from "./McpProtocol.ts"
import type * as McpSchema from "./McpSchema.ts"
import type * as Tool from "./Tool.ts"
import type * as Toolkit from "./Toolkit.ts"

/**
 * Supported MCP wire protocol revisions.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export type ProtocolVersion = "2025-11-25" | "2026-07-28"

/**
 * Service supplied by the built-in MCP transport constructors and layers.
 *
 * **Details**
 *
 * Transport construction owns cleanup through its Effect scope.
 *
 * @stability experimental
 * @category services
 * @since 4.0.6
 */
export const Transport: Context.ServiceClass<Transport, "effect/ai/McpClient/Transport", Transport["Service"]> =
  internal.Transport

/**
 * Type of the Transport service tag.
 *
 * @stability experimental
 * @category services
 * @since 4.0.6
 */
export interface Transport extends
  Context.ServiceClass.Shape<"effect/ai/McpClient/Transport", {
    readonly "~effect/ai/McpClient/Transport": "~effect/ai/McpClient/Transport"
  }>
{}
/**
 * Starts a scoped subprocess using newline-delimited JSON-RPC.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const stdio: (options: {
  readonly command: ChildProcess.Command
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly maxMessageBytes?: ByteSize.Input | undefined
}) => Effect.Effect<Transport["Service"], McpClientError, ChildProcessSpawner | Scope.Scope> = internal.stdio

/**
 * Creates a Streamable HTTP transport with request-owned JSON or SSE responses.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
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
 * The layer scope owns the client and subprocess.
 * `name`, `version` and the optional `title`, `description`, `websiteUrl` and
 * `icons` identify the client to the server. `timeout` defaults to 60 seconds
 * and bounds initialization and each complete `listTools`, `listPrompts` or
 * `listResources` scan. `callTool`, `getPrompt` and `readResource` have no
 * deadline unless their own `timeout` option is supplied.
 *
 * @see {@link layerHttp}
 * @stability experimental
 * @category layers
 * @since 4.0.6
 */
export const layerStdio: (options: {
  readonly name: string
  readonly version: string
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly timeout?: Duration.Input | undefined
  readonly command: ChildProcess.Command
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly maxMessageBytes?: ByteSize.Input | undefined
}) => Layer.Layer<
  McpClient,
  McpClientError,
  ChildProcessSpawner
> = internal.layerStdio

/**
 * Provides a connected MCP client over Streamable HTTP using the HTTP client.
 *
 * **Details**
 *
 * The layer scope owns the client and connection.
 * `name`, `version` and the optional `title`, `description`, `websiteUrl` and
 * `icons` identify the client to the server. `timeout` defaults to 60 seconds
 * and bounds initialization and each complete `listTools`, `listPrompts` or
 * `listResources` scan. `callTool`, `getPrompt` and `readResource` have no
 * deadline unless their own `timeout` option is supplied.
 *
 * **Example** (Providing an HTTP client connection)
 *
 * ```ts import.meta.vitest
 * import { Layer } from "effect"
 * import { McpClient, McpProtocol } from "effect/ai"
 * import { FetchHttpClient } from "effect/http"
 *
 * const ClientLayer = McpClient.layerHttp({
 *   name: "report-workflow",
 *   version: "1.0.0",
 *   protocol: McpProtocol.v2026_07_28,
 *   url: "http://localhost:3000/mcp"
 * }).pipe(Layer.provide(FetchHttpClient.layer))
 * ```
 *
 * @see {@link layerStdio}
 * @stability experimental
 * @category layers
 * @since 4.0.6
 */
export const layerHttp: (options: {
  readonly name: string
  readonly version: string
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly timeout?: Duration.Input | undefined
  readonly url: string | URL
  readonly protocol: McpProtocol.ProtocolAdapter<ProtocolVersion>
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly maxMessageBytes?: ByteSize.Input | undefined
}) => Layer.Layer<
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
 * @stability experimental
 * @category constructors
 * @since 4.0.6
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
 * @stability experimental
 * @category guards
 * @since 4.0.6
 */
export const isClient: (value: unknown) => value is Client = internal.isClient

/**
 * Tool invocation carrying the discovered definition, which supplies the
 * request name and, over modern HTTP, the header routing annotations.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface CallToolParams<S extends Schema.Top = never> {
  readonly tool: McpSchema.Tool
  readonly schema?: S | undefined
  readonly arguments?: typeof McpSchema.CallTool.payloadSchema.Type["arguments"]
}

/**
 * Prompt invocation carrying its discovered definition and string arguments.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface GetPromptParams {
  readonly prompt: McpSchema.Prompt
  readonly arguments?: typeof McpSchema.GetPrompt.payloadSchema.Type["arguments"]
}

/**
 * Resource URI to read from the server.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface ReadResourceParams {
  readonly uri: string
}

/**
 * A scoped connection to one MCP server.
 *
 * @stability experimental
 * @category models
 * @since 4.0.6
 */
export interface Client extends Pipeable {
  readonly [internal.TypeId]: typeof internal.TypeId
  readonly protocolVersion: ProtocolVersion
  readonly serverInfo: McpSchema.Implementation | undefined
  readonly instructions?: string | undefined
  /**
   * Returns every tool page as one snapshot, bounded by the deadline, 100 pages and 10,000 tools.
   * `timeout` overrides the client's discovery deadline.
   */
  readonly listTools: (
    options?: { readonly timeout?: Duration.Input | undefined }
  ) => Effect.Effect<ReadonlyArray<McpSchema.Tool>, McpClientError>
  /** Returns every prompt page as one snapshot with the same bounds as `listTools`. */
  readonly listPrompts: (
    options?: { readonly timeout?: Duration.Input | undefined }
  ) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  /** Gets the messages for a discovered prompt. Unbounded unless `timeout` is supplied. */
  readonly getPrompt: (
    params: GetPromptParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ) => Effect.Effect<McpSchema.GetPromptResult, McpClientError>
  /** Returns every resource page as one snapshot with the same bounds as `listTools`. */
  readonly listResources: (
    options?: { readonly timeout?: Duration.Input | undefined }
  ) => Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
  /** Reads the complete contents of a resource URI. Unbounded unless `timeout` is supplied. */
  readonly readResource: (
    params: ReadResourceParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ) => Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
  /**
   * Calls a discovered tool, optionally decoding with a schema. Errors retain the full result.
   * Unbounded unless `timeout` is supplied.
   */
  readonly callTool: {
    (
      params: CallToolParams,
      options?: { readonly timeout?: Duration.Input | undefined }
    ): Effect.Effect<McpSchema.CallToolResult, McpClientError>
    <S extends Schema.Top>(
      params: CallToolParams<S> & { readonly schema: S },
      options?: { readonly timeout?: Duration.Input | undefined }
    ): Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
    <S extends Schema.Top = never>(
      params: CallToolParams<S>,
      options?: { readonly timeout?: Duration.Input | undefined }
    ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
  }
}

/**
 * Calls a discovered tool and returns the full result, or decodes structured content
 * using the optional schema. With a schema, tool-reported errors fail before decoding
 * and retain the full result. Decoder services are required by the caller.
 *
 * @stability experimental
 * @category operations
 * @since 4.0.6
 */
export const callTool: {
  (
    params: CallToolParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): (self: Client) => Effect.Effect<McpSchema.CallToolResult, McpClientError>
  (
    self: Client,
    params: CallToolParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): Effect.Effect<McpSchema.CallToolResult, McpClientError>
  <S extends Schema.Top>(
    params: CallToolParams<S> & { readonly schema: S },
    options?: { readonly timeout?: Duration.Input | undefined }
  ): (self: Client) => Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top = never>(
    params: CallToolParams<S>,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): (self: Client) => Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top>(
    self: Client,
    params: CallToolParams<S> & { readonly schema: S },
    options?: { readonly timeout?: Duration.Input | undefined }
  ): Effect.Effect<S["Type"], McpClientError, S["DecodingServices"]>
  <S extends Schema.Top = never>(
    self: Client,
    params: CallToolParams<S>,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): Effect.Effect<McpSchema.CallToolResult | S["Type"], McpClientError, S["DecodingServices"]>
} = dual(
  (args) => isClient(args[0]),
  <S extends Schema.Top>(
    self: Client,
    params: CallToolParams<S>,
    options?: { readonly timeout?: Duration.Input | undefined }
  ) => self.callTool(params, options)
)

/**
 * Returns every prompt page as one snapshot with the same bounds as `listTools`.
 *
 * @stability experimental
 * @category operations
 * @since 4.0.6
 */
export const listPrompts: {
  (
    options?: { readonly timeout?: Duration.Input | undefined }
  ): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
  (
    self: Client,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): Effect.Effect<ReadonlyArray<McpSchema.Prompt>, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  (self: Client, options?: { readonly timeout?: Duration.Input | undefined }) => self.listPrompts(options)
)

/**
 * Gets the messages for a discovered prompt.
 *
 * @stability experimental
 * @category operations
 * @since 4.0.6
 */
export const getPrompt: {
  (
    params: GetPromptParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): (self: Client) => Effect.Effect<McpSchema.GetPromptResult, McpClientError>
  (
    self: Client,
    params: GetPromptParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): Effect.Effect<McpSchema.GetPromptResult, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  (self: Client, params: GetPromptParams, options?: { readonly timeout?: Duration.Input | undefined }) =>
    self.getPrompt(params, options)
)

/**
 * Returns every resource page as one snapshot with the same bounds as `listTools`.
 *
 * @stability experimental
 * @category operations
 * @since 4.0.6
 */
export const listResources: {
  (
    options?: { readonly timeout?: Duration.Input | undefined }
  ): (self: Client) => Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
  (
    self: Client,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): Effect.Effect<ReadonlyArray<McpSchema.Resource>, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  (self: Client, options?: { readonly timeout?: Duration.Input | undefined }) => self.listResources(options)
)

/**
 * Reads the complete contents of a resource URI.
 *
 * @stability experimental
 * @category operations
 * @since 4.0.6
 */
export const readResource: {
  (
    params: ReadResourceParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): (self: Client) => Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
  (
    self: Client,
    params: ReadResourceParams,
    options?: { readonly timeout?: Duration.Input | undefined }
  ): Effect.Effect<McpSchema.ReadResourceResult, McpClientError>
} = dual(
  (args) => isClient(args[0]),
  (self: Client, params: ReadResourceParams, options?: { readonly timeout?: Duration.Input | undefined }) =>
    self.readResource(params, options)
)

/**
 * Service tag for applications that provide one default MCP connection.
 *
 * @stability experimental
 * @category services
 * @since 4.0.6
 */
export const McpClient: Context.ServiceClass<McpClient, "effect/ai/McpClient", Client> = internal.McpClient

/**
 * Type of the McpClient service tag.
 *
 * @stability experimental
 * @category services
 * @since 4.0.6
 */
export interface McpClient extends Context.ServiceClass.Shape<"effect/ai/McpClient", Client> {}
/**
 * Constructs and connects a client using the supplied MCP transport service and its protocol adapter.
 *
 * **Details**
 *
 * `name`, `version` and the optional `title`, `description`, `websiteUrl` and
 * `icons` identify the client to the server. `timeout` defaults to 60 seconds
 * and bounds initialization and each complete `listTools`, `listPrompts` or
 * `listResources` scan. `callTool`, `getPrompt` and `readResource` have no
 * deadline unless their own `timeout` option is supplied.
 * Schema decoding requires the schema's services from the caller.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.6
 */
export const make: (options: {
  readonly name: string
  readonly version: string
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly timeout?: Duration.Input | undefined
}) => Effect.Effect<
  Client,
  McpClientError,
  Scope.Scope | Transport
> = internal.make
