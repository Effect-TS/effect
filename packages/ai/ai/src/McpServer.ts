/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { McpSchema } from "./index.js"
import type { Implementation, ServerCapabilities } from "./McpSchema.js"
import { ClientRpcs } from "./McpSchema.js"

export class McpServer extends Context.Tag("@effect/ai/McpServer")<
  McpServer,
  {}
>() {}

export class McpServerOptions extends Context.Tag("@effect/ai/McpServer/Options")<
  McpServerOptions,
  {
    readonly capabilities?: ServerCapabilities
  }
>() {}

export class McpServerImplementation extends Context.Tag("@effect/ai/McpServer/Implementation")<
  McpServerImplementation,
  Implementation
>() {}

export const LATEST_PROTOCOL_VERSION = "2025-03-26"
export const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2024-11-05",
  "2024-10-07"
]

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.gen(function*() {
  const protocol = yield* RpcServer.Protocol
  const handlers = yield* Layer.build(ClientRpcHandlers)

  const patchedProtocol = RpcServer.Protocol.of({
    ...protocol,
    run(f) {
      return protocol.run((clientId, request) => {
        if (request._tag === "Request" && request.tag.startsWith("notifications/")) {
          if (request.tag === "notifications/cancelled") {
            return f(clientId, {
              _tag: "Interrupt",
              requestId: String((request.payload as any).requestId)
            })
          }
          const handler = handlers.unsafeMap.get(request.tag) as Rpc.Handler<string>
          return handler
            ? handler.handler(request.payload, Headers.fromInput(request.headers)) as Effect.Effect<void>
            : Effect.void
        }
        return f(clientId, request)
      })
    }
  })

  return yield* RpcServer.make(ClientRpcs, {
    spanPrefix: "McpServer",
    disableFatalDefects: true
  }).pipe(
    Effect.provideService(RpcServer.Protocol, patchedProtocol),
    Effect.provide(handlers)
  )
}).pipe(Effect.scoped)

const ClientRpcHandlers = ClientRpcs.toLayer(
  Effect.gen(function*() {
    const serverInfo = yield* McpServerImplementation
    const { capabilities = {} } = yield* McpServerOptions
    return {
      // Requests
      ping: () => Effect.succeed({}),
      initialize(params) {
        console.error("MCP Server initialized with params:", params)
        const requestedVersion = params.protocolVersion
        return Effect.succeed({
          capabilities,
          serverInfo,
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
            ? requestedVersion
            : LATEST_PROTOCOL_VERSION
        })
      },
      "completion/complete": () => McpSchema.InternalError.notImplemented,
      "logging/setLevel": () => McpSchema.InternalError.notImplemented,
      "prompts/get": () => McpSchema.InternalError.notImplemented,
      "prompts/list": () => McpSchema.InternalError.notImplemented,
      "resources/list": () => McpSchema.InternalError.notImplemented,
      "resources/read": () => McpSchema.InternalError.notImplemented,
      "resources/subscribe": () => McpSchema.InternalError.notImplemented,
      "resources/unsubscribe": () => McpSchema.InternalError.notImplemented,
      "resources/templates/list": () => McpSchema.InternalError.notImplemented,
      "tools/call": () => McpSchema.InternalError.notImplemented,
      "tools/list": () => McpSchema.InternalError.notImplemented,

      // Notifications
      "notifications/cancelled": (_) => Effect.void,
      "notifications/initialized": (_) => Effect.void,
      "notifications/progress": (_) => Effect.void,
      "notifications/roots/list_changed": (_) => Effect.void
    }
  })
)

export const layer = (
  serverInfo: Context.Tag.Service<McpServerImplementation>,
  options?: Context.Tag.Service<McpServerOptions>
) =>
  Layer.scopedDiscard(Effect.forkScoped(make)).pipe(
    Layer.provide([
      Layer.succeed(McpServerImplementation, serverInfo),
      Layer.succeed(McpServerOptions, options ?? {})
    ])
  )
