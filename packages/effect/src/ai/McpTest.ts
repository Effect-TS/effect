/**
 * In-memory test client for `McpServer` registrations.
 *
 * `McpTest.makeClient` runs the MCP server over an in-memory
 * `RpcServer.Protocol`, performs the handshake for the selected protocol
 * version, and returns a typed client. Requests travel through the same
 * JSON-RPC encoding, routing, middleware, and response encoding as the stdio
 * and HTTP transports, so tests reach protocol encoding, list methods,
 * sessions, and notifications without opening a transport.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Arr from "../Array.ts"
import type * as Cause from "../Cause.ts"
import * as Effect from "../Effect.ts"
import type * as Layer from "../Layer.ts"
import type * as Queue from "../Queue.ts"
import type * as Scope from "../Scope.ts"
import type * as McpProtocol from "./McpProtocol.ts"
import type * as McpSchema from "./McpSchema.ts"
import type * as McpServer from "./McpServer.ts"

/**
 * A typed in-memory MCP client connected to a running `McpServer`.
 *
 * **Details**
 *
 * Each request method mirrors one entry of `McpSchema.ClientRequestRpcs`,
 * except `initialize`, which `makeClient` sends during the handshake. Requests
 * are encoded with the client schemas and decoded with the server's selected
 * protocol adapter, so results and errors match what a wire client observes.
 *
 * Server-to-client notifications are decoded into `notifications` in delivery
 * order. Server-to-client requests (elicitation, sampling, roots) are not
 * answered by this client.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Client {
  /**
   * The protocol version negotiated during the handshake.
   */
  readonly protocolVersion: McpProtocol.ProtocolVersion
  /**
   * The `McpServer` service the client is connected to, for registering
   * capabilities or emitting notifications from a test.
   */
  readonly server: McpServer.McpServer["Service"]
  /**
   * Notifications the server sent to this client, in delivery order.
   */
  readonly notifications: Queue.Dequeue<McpSchema.ServerNotificationEncoded>
  readonly ping: Effect.Effect<void, McpSchema.McpError>
  readonly listTools: (
    request?: typeof McpSchema.ListTools.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListToolsResult, McpSchema.McpError>
  readonly callTool: (
    request: typeof McpSchema.CallTool.payloadSchema.Type
  ) => Effect.Effect<McpSchema.CallToolResult, McpSchema.McpError>
  readonly listResources: (
    request?: typeof McpSchema.ListResources.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListResourcesResult, McpSchema.McpError>
  readonly listResourceTemplates: (
    request?: typeof McpSchema.ListResourceTemplates.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListResourceTemplatesResult, McpSchema.McpError>
  readonly readResource: (
    request: typeof McpSchema.ReadResource.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ReadResourceResult, McpSchema.McpError>
  readonly subscribe: (
    request: typeof McpSchema.Subscribe.payloadSchema.Type
  ) => Effect.Effect<void, McpSchema.McpError>
  readonly unsubscribe: (
    request: typeof McpSchema.Unsubscribe.payloadSchema.Type
  ) => Effect.Effect<void, McpSchema.McpError>
  readonly listPrompts: (
    request?: typeof McpSchema.ListPrompts.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListPromptsResult, McpSchema.McpError>
  readonly getPrompt: (
    request: typeof McpSchema.GetPrompt.payloadSchema.Type
  ) => Effect.Effect<McpSchema.GetPromptResult, McpSchema.McpError>
  readonly complete: (
    request: typeof McpSchema.Complete.payloadSchema.Type
  ) => Effect.Effect<McpSchema.CompleteResult, McpSchema.McpError>
  readonly setLevel: (
    request: typeof McpSchema.SetLevel.payloadSchema.Type
  ) => Effect.Effect<void, McpSchema.McpError>
}

/**
 * Creates an in-memory MCP client for a registration layer.
 *
 * **Details**
 *
 * The server is built from `McpServer.layer` with the supplied `protocols`
 * and `registrations`, over an in-memory `RpcServer.Protocol`. The client
 * speaks `options.protocolVersion`, by default the first adapter's version:
 * stateful versions `initialize` and send `notifications/initialized` before
 * `makeClient` returns; the stateless version attaches request metadata to
 * every request instead.
 *
 * Because requests reach handlers through the server runner, the transport
 * built-ins are discharged the same way as on stdio: `McpRequestContext` on
 * every request, and `McpServerClient` only when every adapter in `protocols`
 * is stateful (see `McpServer.ProvidedServices`). Any other `McpRequest`
 * marker in `registrations` stays in the requirements and must be met by MCP
 * middleware; providing the service directly does not discharge it.
 *
 * The client and server live in the surrounding `Scope`.
 *
 * **Example**
 *
 * ```ts
 * import { assert } from "@effect/vitest"
 * import * as McpProtocol from "effect/ai/McpProtocol"
 * import * as McpServer from "effect/ai/McpServer"
 * import * as McpTest from "effect/ai/McpTest"
 * import * as Effect from "effect/Effect"
 *
 * const registrations = McpServer.resource({
 *   uri: "test://greeting",
 *   name: "greeting",
 *   content: Effect.succeed("hello")
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* McpTest.makeClient(registrations, {
 *     protocols: [McpProtocol.v2025_11_25]
 *   })
 *   const result = yield* client.readResource({ uri: "test://greeting" })
 *   assert.strictEqual(result.contents.length, 1)
 * }).pipe(Effect.scoped)
 * ```
 *
 * @see {@link Client} for the request methods and notifications
 * @see {@link McpServer.middleware} for discharging request-level dependencies
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeClient: <
  const Protocols extends Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>,
  RA = never,
  RE = never,
  RR = never
>(
  registrations: Layer.Layer<RA, RE, RR>,
  options: {
    readonly protocols: Protocols
    readonly protocolVersion?: Protocols[number]["protocolVersion"] | undefined
    readonly name?: string | undefined
    readonly version?: string | undefined
    readonly instructions?: string | undefined
    readonly extensions?: NonNullable<McpSchema.ServerCapabilities["extensions"]> | undefined
    readonly clientInfo?: McpSchema.Implementation | undefined
    readonly clientCapabilities?: McpSchema.ClientCapabilities | undefined
  }
) => Effect.Effect<
  Client,
  Cause.IllegalArgumentError | RE,
  | Scope.Scope
  | Exclude<McpServer.McpRequest.Without<RR>, McpServer.McpServer>
  | McpServer.McpRequest.From<
    "Requires",
    Exclude<McpServer.McpRequest.Only<"Requires", RR>, McpServer.ProvidedServices<Protocols>>
  >
> = (_registrations, _options) => Effect.die(new Error("McpTest.makeClient is not implemented"))
