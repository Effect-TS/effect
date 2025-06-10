/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import { RpcMessage } from "@effect/rpc"
import type * as Rpc from "@effect/rpc/Rpc"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import { RequestId } from "@effect/rpc/RpcMessage"
import * as RpcServer from "@effect/rpc/RpcServer"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import { TreeFormatter } from "effect/ParseResult"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import type { ClientRequestRpcs, FromServerEncoded, Implementation, ServerCapabilities } from "./McpSchema.js"
import { ClientRpcs, INTERNAL_ERROR_CODE, INVALID_PARAMS_ERROR_CODE, METHOD_NOT_FOUND_ERROR_CODE } from "./McpSchema.js"
import * as McpTransport from "./McpTransport.js"

// TODO:
// - Finish error types
// - Investigate encoded errors in transport.send

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
export const makeRpc = Effect.gen(function*() {
  const protocol = yield* RpcServer.Protocol
  const handlers = yield* Layer.build(ClientRpcHandlers)

  const patchedProtocol = RpcServer.Protocol.of({
    ...protocol,
    run(f) {
      return protocol.run((clientId, request) => {
        if (request._tag === "Request" && request.id === "") {
          if (request.tag === "notifications/cancelled") {
            return f(clientId, {
              _tag: "Interrupt",
              requestId: String((request.payload as any).requestId)
            })
          }
          // TODO: notification handlers
        }
        return f(clientId, request)
      })
    }
  })

  yield* RpcServer.make(ClientRpcs, {
    spanPrefix: "McpServer",
    disableFatalDefects: true
  }).pipe(
    Effect.provideService(RpcServer.Protocol, patchedProtocol),
    Effect.provide(handlers),
    Effect.forkScoped,
    Effect.interruptible
  )

  return {} as const
})

/**
 * @since 1.0.0
 * @category Mcp Server
 */
export const make = Effect.gen(function*() {
  const transport = yield* McpTransport.McpTransport
  const context = yield* Effect.context<never>()
  const scope = yield* Scope.make()

  type Rpcs = RpcGroup.Rpcs<typeof ClientRequestRpcs>

  type Schemas = {
    readonly decode: (u: unknown) => Effect.Effect<Rpc.Payload<Rpcs>, ParseError>
    readonly encodeChunk: (u: ReadonlyArray<unknown>) => Effect.Effect<NonEmptyReadonlyArray<unknown>, ParseError>
    readonly encodeSuccess: (u: unknown) => Effect.Effect<unknown, ParseError>
    readonly encodeFailure: (u: unknown) => Effect.Effect<unknown, ParseError>
    readonly context: Context.Context<never>
  }

  type Client = {
    readonly id: number
    readonly schemas: Map<RequestId, Schemas>
  }
  const clients = new Map<number, Client>()

  const schemasCache = new WeakMap<any, Schemas>()
  const getRequestSchemas = (rpc: Rpc.AnyWithProps) => {
    let metadata = schemasCache.get(rpc)
    if (!metadata) {
      const entry = context.unsafeMap.get(rpc.key) as Rpc.Handler<Rpcs["_tag"]>
      metadata = {
        decode: Schema.decodeUnknown(rpc.payloadSchema as any),
        encodeChunk: Schema.encodeUnknown(Schema.Array(Schema.Any)) as any,
        encodeSuccess: Schema.encodeUnknown(rpc.successSchema) as any,
        encodeFailure: Schema.encodeUnknown(rpc.errorSchema as any) as any,
        context: entry.context
      }
      schemasCache.set(rpc, metadata)
    }
    return metadata
  }

  const handleEncode = <A, R>(
    client: Client,
    requestId: RequestId,
    encode: Effect.Effect<A, ParseError, R>,
    onSuccess: (value: A) => FromServerEncoded | ReadonlyArray<FromServerEncoded>
  ) =>
    Effect.catchAllCause(
      Effect.flatMap(encode, (value) => transport.send(client.id, onSuccess(value))),
      (cause) => {
        client.schemas.delete(requestId)
        const message = Cause.squash(Cause.map(cause, TreeFormatter.formatErrorSync))
        return transport.send(client.id, {
          _tag: "Failure",
          id: Number(requestId),
          error: {
            code: INTERNAL_ERROR_CODE,
            message: `Failed to encode response\n${message}`
          }
        })
      }
    )

  const server = yield* RpcServer.makeNoSerialization(ClientRpcs, {
    disableClientAcks: true,
    disableSpanPropagation: true,
    disableTracing: true,
    onFromServer(response) {
      const client = clients.get(response.clientId)
      if (!client) return Effect.void
      switch (response._tag) {
        case "Chunk": {
          const metadata = client.schemas.get(response.requestId)
          if (!metadata) return Effect.void
          return handleEncode(
            client,
            response.requestId,
            Effect.provide(metadata.encodeChunk(response.values), metadata.context),
            (results) =>
              results.map((result) => ({
                _tag: "Success",
                id: Number(response.requestId),
                result: result as any
              }))
          )
        }
        case "Exit": {
          const metadata = client.schemas.get(response.requestId)
          if (!metadata) return Effect.void
          client.schemas.delete(response.requestId)
          return handleEncode(
            client,
            response.requestId,
            Exit.match(response.exit, {
              onFailure: (cause): Effect.Effect<Either.Either<unknown, unknown>, ParseError> =>
                metadata.encodeFailure(Cause.squash(cause)).pipe(
                  Effect.map((error) => Either.left(error))
                ),
              onSuccess: (value): Effect.Effect<Either.Either<unknown, unknown>, ParseError> =>
                metadata.encodeSuccess(value).pipe(
                  Effect.map((value) => Either.right(value))
                )
            }),
            Either.match({
              onLeft: (error) => ({
                _tag: "Failure",
                id: Number(response.requestId),
                error: error as any
              }),
              onRight: (result) => ({
                _tag: "Success",
                id: Number(response.requestId),
                result: result as any
              })
            })
          )
        }
        case "ClientEnd": {
          clients.delete(response.clientId)
          return transport.end(response.clientId)
        }
        case "Defect": {
          // TODO: defects do not contain the requestId (?)
          return Effect.void
        }
      }
    }
  }).pipe(Scope.extend(scope))

  yield* transport.run(
    Effect.fnUntraced(function*(clientId, request) {
      let client = clients.get(clientId)
      if (!client) {
        client = {
          id: clientId,
          schemas: new Map()
        }
        clients.set(clientId, client)
      }

      const rpc = ClientRpcs.requests.get(request.method)
      if (!rpc) {
        // For unknown notifications, ignore the request
        if (request._tag === "Notification") return
        // For unknown requests, respond with an error
        return yield* transport.send(clientId, {
          _tag: "Failure",
          id: request.id,
          error: {
            code: METHOD_NOT_FOUND_ERROR_CODE,
            message: "Method not found",
            data: { method: request.method }
          }
        })
      }

      switch (request._tag) {
        case "Request": {
          const requestId = RequestId(typeof request.id === "string" ? request.id : BigInt(request.id))
          const metadata = getRequestSchemas(rpc)
          return yield* Effect.matchEffect(
            Effect.provide(metadata.decode(request.payload), metadata.context),
            {
              onFailure: (_error) => {
                return transport.send(clientId, {
                  _tag: "Failure",
                  id: request.id,
                  error: {
                    code: INVALID_PARAMS_ERROR_CODE,
                    message: `Invalid parameters for method: "${request.method}"`,
                    data: { params: request.payload }
                  }
                })
              },
              onSuccess: (payload) => {
                client.schemas.set(requestId, metadata)
                return server.write(client.id, {
                  _tag: "Request",
                  id: requestId,
                  tag: request.method,
                  payload,
                  headers: Headers.empty,
                  sampled: false,
                  spanId: "",
                  traceId: ""
                })
              }
            }
          )
        }
        case "Notification": {
          return Effect.void
        }
      }
    })
  ).pipe(
    Effect.interruptible,
    Effect.tapErrorCause((cause) => Effect.sync(() => console.error("BUG: McpServer protocol crashed", cause))),
    Effect.onExit((exit) => Scope.close(scope, exit))
  )

  return {} as const
})

const ClientRpcHandlers = ClientRpcs.toLayer(
  Effect.gen(function*() {
    const serverInfo = yield* McpServerImplementation
    const { capabilities = {} } = yield* McpServerOptions
    return {
      // Requests
      ping: () => Effect.succeed({}),
      initialize: Effect.fnUntraced(function*(params) {
        const requestedVersion = params.protocolVersion
        return {
          capabilities,
          serverInfo,
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
            ? requestedVersion
            : LATEST_PROTOCOL_VERSION
        }
      }),
      "completion/complete": () => Effect.dieMessage("Not implemented"),
      "logging/setLevel": () => Effect.dieMessage("Not implemented"),
      "prompts/get": () => Effect.dieMessage("Not implemented"),
      "prompts/list": () => Effect.dieMessage("Not implemented"),
      "resources/list": () => Effect.dieMessage("Not implemented"),
      "resources/read": () => Effect.dieMessage("Not implemented"),
      "resources/subscribe": () => Effect.dieMessage("Not implemented"),
      "resources/unsubscribe": () => Effect.dieMessage("Not implemented"),
      "resources/templates/list": () => Effect.dieMessage("Not implemented"),
      "tools/call": () => Effect.dieMessage("Not implemented"),
      "tools/list": () => Effect.dieMessage("Not implemented"),

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
) => Layer.mergeAll(Layer.succeed(McpServerImplementation, serverInfo), Layer.succeed(McpServerOptions, options ?? {}))

// Usage
//
// const MainLayer = layer({
//   name: "Demo Server",
//   version: "1.0.0"
// }, {
//   capabilities: {
//     logging: {},
//     prompts: {}
//   }
// }).pipe(
//   Layer.provide(McpTransport.layerTransportStdio())
// )

// Layer.launch(MainLayer).pipe(
//   Effect.runPromise
// )
