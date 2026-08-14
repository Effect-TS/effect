/**
 * Runtime descriptors for MCP protocol adapters.
 *
 * @internal
 */
import type { NonEmptyReadonlyArray } from "../../../Array.ts"
import * as Cause from "../../../Cause.ts"
import * as Context from "../../../Context.ts"
import * as Effect from "../../../Effect.ts"
import * as Encoding from "../../../Encoding.ts"
import * as Layer from "../../../Layer.ts"
import type * as LogLevel from "../../../LogLevel.ts"
import * as Result from "../../../Result.ts"
import type * as Headers from "../../http/Headers.ts"
import { appendPreResponseHandlerUnsafe } from "../../http/HttpEffect.ts"
import * as HttpServerRequest from "../../http/HttpServerRequest.ts"
import * as HttpServerResponse from "../../http/HttpServerResponse.ts"
import * as RpcGroup from "../../rpc/RpcGroup.ts"
import type * as RpcMessage from "../../rpc/RpcMessage.ts"
import type * as PublicMcpProtocol from "../McpProtocol.ts"
import * as PublicMcpSchema from "../McpSchema.ts"
import type * as McpCore from "./mcpCore.ts"
import * as McpProtocol from "./mcpProtocol.ts"
import * as McpProtocolRegistry from "./mcpProtocolRegistry.ts"
import * as McpStatefulRuntime from "./mcpStatefulRuntime.ts"

const MCP_SESSION_ID_HEADER = "mcp-session-id"
const MCP_PROTOCOL_VERSION_HEADER = "mcp-protocol-version"
const MCP_METHOD_HEADER = "mcp-method"
const MCP_NAME_HEADER = "mcp-name"
const PROTOCOL_VERSION_METADATA_KEY = "io.modelcontextprotocol/protocolVersion"
const BASE64_SENTINEL_PREFIX = "=?base64?"
const BASE64_SENTINEL_SUFFIX = "?="

const asRecord = (input: unknown): Record<string, unknown> | undefined =>
  typeof input === "object" && input !== null ? input as Record<string, unknown> : undefined

const modernVersionClaim = (input: unknown): { readonly present: boolean; readonly value: unknown } => {
  const params = asRecord(asRecord(input)?.params)
  const metadata = asRecord(params?._meta)
  return metadata !== undefined && PROTOCOL_VERSION_METADATA_KEY in metadata
    ? { present: true, value: metadata[PROTOCOL_VERSION_METADATA_KEY] }
    : { present: false, value: undefined }
}

const decodeRoutingHeader = (value: string): string | undefined => {
  const startsWithSentinel = value.startsWith(BASE64_SENTINEL_PREFIX)
  const endsWithSentinel = value.endsWith(BASE64_SENTINEL_SUFFIX)
  if (!startsWithSentinel && !endsWithSentinel) {
    return /^[\x20-\x7e]*$/.test(value) ? value : undefined
  }
  if (!startsWithSentinel || !endsWithSentinel) {
    return undefined
  }
  const encoded = value.slice(BASE64_SENTINEL_PREFIX.length, -BASE64_SENTINEL_SUFFIX.length)
  const decoded = Encoding.decodeBase64String(encoded)
  return Result.isSuccess(decoded) ? decoded.success : undefined
}

const routingName = (input: unknown): string | undefined => {
  const request = asRecord(input)
  const params = asRecord(request?.params)
  switch (request?.method) {
    case "tools/call":
    case "prompts/get":
      return typeof params?.name === "string" ? params.name : undefined
    case "resources/read":
      return typeof params?.uri === "string" ? params.uri : undefined
    default:
      return undefined
  }
}

const requiresRoutingName = (method: unknown): boolean =>
  method === "tools/call" || method === "resources/read" || method === "prompts/get"

const headerMismatch = (message: string): HttpAdmission => ({
  _tag: "Rejected",
  status: 400,
  error: { code: -32020, message }
})

const PingRpcs = RpcGroup.make(PublicMcpSchema.Ping).middleware(PublicMcpSchema.McpServerClientMiddleware)

/** @internal */
export interface RequestBinding {
  readonly initializePayload: typeof PublicMcpSchema.Initialize.payloadSchema.Type
  readonly negotiatedProfile: McpCore.NegotiatedProtocolProfile
  readonly protocol: PublicMcpProtocol.AnyProtocolAdapter
}

/** @internal */
export interface PreparedRequest {
  readonly protocol: PublicMcpProtocol.AnyProtocolAdapter
  readonly binding?: RequestBinding | undefined
  readonly profile?: McpCore.NegotiatedProtocolProfile<string> | undefined
  readonly requestContext?: PublicMcpSchema.McpRequestContext["Service"] | undefined
}

/** @internal */
export type HttpAdmission =
  | {
    readonly _tag: "Accepted"
    readonly binding: RequestBinding | undefined
    readonly protocol?: PublicMcpProtocol.AnyProtocolAdapter | undefined
  }
  | {
    readonly _tag: "Rejected"
    readonly status: 400 | 404
    readonly error?: {
      readonly code: number
      readonly message: string
      readonly data?: unknown
    } | undefined
  }

/** @internal */
export interface HandlerInstallationOptions {
  readonly core: McpCore.McpCore
  readonly defaultLogLevel: LogLevel.LogLevel
  readonly serverInfo: {
    readonly name: string
    readonly version: string
    readonly description?: string | undefined
    readonly websiteUrl?: string | undefined
    readonly icons?: ReadonlyArray<PublicMcpSchema.Icon> | undefined
    readonly extensions?: NonNullable<typeof PublicMcpSchema.ServerCapabilities.Type["extensions"]> | undefined
  }
}

/** @internal */
export const stateful = (
  transport: PublicMcpProtocol.TransportPolicy
): PublicMcpProtocol.StatefulRuntimeDescriptor => ({
  _tag: "Stateful",
  transport
})

/** @internal */
export interface ServerRuntimeShape {
  readonly protocols: NonEmptyReadonlyArray<PublicMcpProtocol.AnyProtocolAdapter>
  readonly clientRpcs: McpProtocolRegistry.ProtocolRegistry<PublicMcpProtocol.AnyProtocolAdapter>["clientRpcs"]
  readonly selectProtocol: (offeredVersion: string) => PublicMcpProtocol.AnyProtocolAdapter
  readonly protocolForInternalTag: (tag: string) => PublicMcpProtocol.AnyProtocolAdapter
  readonly routeClientRequest: (
    protocol: PublicMcpProtocol.AnyProtocolAdapter,
    request: RpcMessage.RequestEncoded
  ) => RpcMessage.RequestEncoded
  readonly prepareRequest: (
    clientId: number,
    headers: Headers.Headers,
    request: RpcMessage.RequestEncoded
  ) => Effect.Effect<PreparedRequest, unknown>
  readonly resolveRequest: (clientId: number, headers: Headers.Headers) => RequestBinding | undefined
  readonly admitHttp: (headers: Headers.Headers, input: unknown) => HttpAdmission
  readonly effectLogLevel: (
    clientId: number,
    headers: Headers.Headers,
    fallback: LogLevel.LogLevel
  ) => LogLevel.LogLevel
  readonly disconnect: (clientId: number) => void
  readonly deliveryClientIds: () => Iterable<number>
  readonly canDeliver: (
    clientId: number,
    headers: Headers.Headers,
    notification: McpCore.ServerNotification,
    fallbackLogLevel: LogLevel.LogLevel
  ) => boolean
  readonly installHandlers: (
    options: HandlerInstallationOptions
  ) => Effect.Effect<Context.Context<never>, never, unknown>
}

/** @internal */
export class ServerRuntime extends Context.Service<ServerRuntime, ServerRuntimeShape>()(
  "effect/ai/McpRuntime/ServerRuntime"
) {}

/** @internal */
export const make = Effect.fnUntraced(function*(
  protocols: NonEmptyReadonlyArray<PublicMcpProtocol.AnyProtocolAdapter>
) {
  const statefulProtocol = protocols.find((protocol) => protocol.runtime._tag === "Stateful")
  const stateful = statefulProtocol === undefined ? undefined : McpStatefulRuntime.make()
  const protocolVersions = protocols.map((protocol) => protocol.protocolVersion)
  let statelessDescriptor: PublicMcpProtocol.StatelessRuntimeDescriptor | undefined
  let statelessProtocol: PublicMcpProtocol.AnyProtocolAdapter | undefined
  for (const protocol of protocols) {
    if (protocol.runtime._tag !== "Stateless") {
      continue
    }
    if (statelessDescriptor !== undefined) {
      return yield* new Cause.IllegalArgumentError(
        "MCP runtime supports at most one stateless protocol"
      )
    }
    statelessDescriptor = protocol.runtime
    statelessProtocol = protocol
  }
  const registry = yield* McpProtocolRegistry.make(protocols)
  const protocolForInternalTag = (tag: string): PublicMcpProtocol.AnyProtocolAdapter => {
    for (const protocol of registry.protocols) {
      const routed = registry.routeClientRequest(protocol, {
        _tag: "Request",
        id: 0,
        tag: "",
        payload: undefined,
        headers: []
      })
      if (tag.startsWith(routed.tag)) {
        return protocol
      }
    }
    return registry.protocols[0]
  }
  return ServerRuntime.of({
    protocols: registry.protocols,
    clientRpcs: registry.clientRpcs,
    selectProtocol: registry.select,
    protocolForInternalTag,
    routeClientRequest: registry.routeClientRequest,
    prepareRequest: Effect.fnUntraced(function*(clientId, headers, request) {
      const binding = stateful?.resolve(clientId, headers)
      let protocol: PublicMcpProtocol.AnyProtocolAdapter | undefined = binding?.protocol
      if (protocol === undefined) {
        const metadata = typeof request.payload === "object" && request.payload !== null && "_meta" in request.payload
          ? request.payload._meta
          : undefined
        const hasStatelessVersion = typeof metadata === "object" && metadata !== null &&
          "io.modelcontextprotocol/protocolVersion" in metadata
        const offeredVersion = hasStatelessVersion &&
            typeof metadata["io.modelcontextprotocol/protocolVersion"] === "string"
          ? metadata["io.modelcontextprotocol/protocolVersion"]
          : undefined
        protocol = hasStatelessVersion
          ? registry.protocols.find((protocol) => protocol.protocolVersion === offeredVersion) ?? statelessProtocol ??
            registry.protocols[0]
          : offeredVersion === undefined
          ? request.tag === "initialize"
            ? registry.select((request.payload as any)?.protocolVersion)
            : registry.protocols[0]
          : registry.select(offeredVersion)
      }
      if (protocol.runtime._tag === "Stateful") {
        return { protocol, binding }
      }
      if (statelessDescriptor === undefined) {
        return yield* Effect.die("MCP stateless runtime invariant failed")
      }
      const metadata = typeof request.payload === "object" && request.payload !== null && "_meta" in request.payload
        ? request.payload._meta
        : undefined
      const requestedVersion = typeof metadata === "object" && metadata !== null &&
          "io.modelcontextprotocol/protocolVersion" in metadata &&
          typeof metadata["io.modelcontextprotocol/protocolVersion"] === "string"
        ? metadata["io.modelcontextprotocol/protocolVersion"]
        : undefined
      if (requestedVersion !== undefined && requestedVersion !== protocol.protocolVersion) {
        return yield* new McpProtocol.ProtocolError({
          code: -32022,
          message: `Unsupported protocol version '${requestedVersion}'`,
          data: { supported: protocolVersions, requested: requestedVersion }
        })
      }
      const decodedProfile = yield* statelessDescriptor.profileFromRequestMetadata(metadata)
      const profile: McpCore.NegotiatedProtocolProfile<string> = {
        protocolVersion: decodedProfile.protocolVersion,
        clientCapabilities: decodedProfile.clientCapabilities,
        clientInfo: decodedProfile.clientInfo,
        requestMetadata: decodedProfile.requestMetadata
      }
      const requestContext = PublicMcpSchema.McpRequestContext.of({
        clientId,
        protocolVersion: profile.protocolVersion,
        clientCapabilities: profile.clientCapabilities,
        clientInfo: profile.clientInfo,
        requestMetadata: profile.requestMetadata
      })
      return { protocol, profile, requestContext }
    }),
    resolveRequest: (clientId, headers) => stateful?.resolve(clientId, headers),
    admitHttp: (headers, input) => {
      const protocolVersion = headers[MCP_PROTOCOL_VERSION_HEADER]
      const sessionId = headers[MCP_SESSION_ID_HEADER]
      const claim = modernVersionClaim(input)
      const isStatelessRequest = (asRecord(input)?.method !== "initialize" && claim.present) ||
        (statelessProtocol !== undefined && protocolVersion === statelessProtocol.protocolVersion)
      if (isStatelessRequest) {
        if (protocolVersion === undefined) {
          return headerMismatch("MCP-Protocol-Version header is required")
        }
        if (typeof claim.value !== "string" || claim.value !== protocolVersion) {
          return headerMismatch("MCP-Protocol-Version header does not match request metadata")
        }
        if (statelessProtocol === undefined || protocolVersion !== statelessProtocol.protocolVersion) {
          return {
            _tag: "Rejected",
            status: 400,
            error: {
              code: -32022,
              message: `Unsupported protocol version '${protocolVersion}'`,
              data: {
                supported: protocolVersions,
                requested: protocolVersion
              }
            }
          }
        }
        const request = asRecord(input)
        const method = request?.method
        if (method === "initialize") {
          return headerMismatch("initialize is not supported by stateless MCP protocols")
        }
        if (typeof method !== "string" || headers[MCP_METHOD_HEADER] !== method) {
          return headerMismatch("Mcp-Method header does not match request method")
        }
        if (requiresRoutingName(method)) {
          const name = routingName(input)
          const header = headers[MCP_NAME_HEADER]
          if (name === undefined || header === undefined || decodeRoutingHeader(header) !== name) {
            return headerMismatch("Mcp-Name header does not match request parameters")
          }
        }
        return { _tag: "Accepted", binding: undefined, protocol: statelessProtocol }
      }
      const binding = sessionId === undefined ? undefined : stateful?.resolveSessionId(sessionId)
      if (sessionId !== undefined && binding === undefined) {
        return { _tag: "Rejected", status: 404 }
      }
      if (
        protocolVersion !== undefined &&
        !registry.protocols.some((protocol) => protocol.protocolVersion === protocolVersion)
      ) {
        return { _tag: "Rejected", status: 400 }
      }
      if (
        binding?.protocol.runtime.transport.http.requiresVersionHeader === true &&
        protocolVersion !== binding.protocol.protocolVersion
      ) {
        return { _tag: "Rejected", status: 400 }
      }
      return { _tag: "Accepted", binding, protocol: binding?.protocol }
    },
    effectLogLevel: (clientId, headers, fallback) => stateful?.effectLogLevel(clientId, headers, fallback) ?? fallback,
    disconnect: (clientId) => stateful?.disconnect(clientId),
    deliveryClientIds: () => stateful?.initializedClientIds() ?? [],
    canDeliver: (clientId, headers, notification, fallback) =>
      stateful?.canDeliver(clientId, headers, notification, fallback) ?? false,
    installHandlers: Effect.fnUntraced(function*(options) {
      const contextMap = new Map<string, unknown>()
      const registrationPresence = yield* options.core.registrationPresence
      const installationContext: McpProtocol.HandlerInstallationContext = {
        supportedVersions: protocolVersions,
        serverInfo: options.serverInfo,
        registrationPresence
      }
      const handlerTarget = registry.handlerTarget(contextMap, installationContext)
      for (const protocol of registry.protocols) {
        if (protocol.runtime._tag === "Stateless") {
          yield* protocol.installHandlers(options.core, undefined, handlerTarget)
          continue
        }
        if (stateful === undefined) {
          return yield* Effect.die("MCP sessionful runtime invariant failed")
        }
        yield* handlerTarget.install(protocol, PingRpcs, PingRpcs.of({ ping: () => Effect.succeed({}) }))
        const lifecycle: McpProtocol.LifecycleRuntime = {
          initialize: Effect.fnUntraced(function*(protocolVersion, profile, clientId) {
            const presence = yield* options.core.registrationPresence
            let capabilities: McpCore.CanonicalServerCapabilities = {
              completions: true,
              logging: true
            }
            if (presence.tools) {
              capabilities = { ...capabilities, tools: { listChanged: true } }
            }
            if (presence.resources) {
              capabilities = {
                ...capabilities,
                resources: { listChanged: true, subscribe: true }
              }
            }
            if (presence.prompts) {
              capabilities = { ...capabilities, prompts: { listChanged: true } }
            }
            if (options.serverInfo.extensions) {
              capabilities = { ...capabilities, extensions: options.serverInfo.extensions }
            }
            return yield* Effect.withFiber((fiber) => {
              const httpRequest = Context.getOrUndefined(fiber.context, HttpServerRequest.HttpServerRequest)
              if (httpRequest !== undefined && capabilities.resources !== undefined) {
                capabilities = {
                  ...capabilities,
                  resources: { ...capabilities.resources, subscribe: false }
                }
              }
              const initializePayload = PublicMcpSchema.Initialize.payloadSchema.make({
                protocolVersion,
                capabilities: profile.clientCapabilities,
                clientInfo: profile.clientInfo!,
                _meta: profile.requestMetadata
              })
              const registration: McpStatefulRuntime.Registration = {
                initializePayload,
                negotiatedProfile: profile,
                protocol: protocol as PublicMcpProtocol.ProtocolAdapter,
                supportsResourceSubscriptions: httpRequest === undefined &&
                  capabilities.resources?.subscribe === true,
                logLevel: options.defaultLogLevel
              }
              if (httpRequest !== undefined) {
                const sessionId = crypto.randomUUID()
                stateful.registerHttp(sessionId, registration)
                appendPreResponseHandlerUnsafe(
                  httpRequest,
                  (_request, response) =>
                    Effect.succeed(HttpServerResponse.setHeaders(response, {
                      [MCP_SESSION_ID_HEADER]: sessionId,
                      [MCP_PROTOCOL_VERSION_HEADER]: protocol.protocolVersion
                    }))
                )
              } else {
                stateful.registerConnection(clientId, registration)
              }
              return Effect.succeed({
                capabilities,
                serverInfo: PublicMcpSchema.Implementation.make({
                  name: options.serverInfo.name,
                  version: options.serverInfo.version,
                  description: options.serverInfo.description,
                  websiteUrl: options.serverInfo.websiteUrl,
                  icons: options.serverInfo.icons
                })
              })
            })
          }),
          setLogLevel: stateful.setLogLevel,
          subscribe: stateful.subscribe,
          unsubscribe: stateful.unsubscribe,
          clientNotification: Effect.fnUntraced(function*(notification, clientId) {
            if (notification._tag === "Initialized") {
              stateful.markInitialized(clientId)
            }
          })
        }
        yield* protocol.installHandlers(options.core, lifecycle, handlerTarget)
      }
      return Context.makeUnsafe(contextMap)
    })
  })
})

/** @internal */
export const layer = (
  protocols: NonEmptyReadonlyArray<PublicMcpProtocol.AnyProtocolAdapter>
): Layer.Layer<ServerRuntime, Cause.IllegalArgumentError> => Layer.effect(ServerRuntime)(make(protocols))
