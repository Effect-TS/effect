/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import * as Rpc from "@effect/rpc/Rpc"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import { RequestId } from "@effect/rpc/RpcMessage"
import * as RpcServer from "@effect/rpc/RpcServer"
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import { TreeFormatter } from "effect/ParseResult"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import type { ClientRequestRpcs, Implementation, ServerCapabilities } from "./McpSchema.js"
import { ClientRpcs } from "./McpSchema.js"
import * as McpTransport from "./McpTransport.js"

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
    readonly encodeExit: (u: unknown) => Effect.Effect<Schema.ExitEncoded<unknown, unknown, unknown>, ParseError>
    readonly context: Context.Context<never>
  }

  const schemasCache = new WeakMap<any, Schemas>()
  const getSchemas = (rpc: Rpc.AnyWithProps) => {
    let schemas = schemasCache.get(rpc)
    if (!schemas) {
      const entry = context.unsafeMap.get(rpc.key) as Rpc.Handler<Rpcs["_tag"]>
      schemas = {
        decode: Schema.decodeUnknown(rpc.payloadSchema as any),
        encodeChunk: Schema.encodeUnknown(Schema.Any) as any,
        encodeExit: Schema.encodeUnknown(Rpc.exitSchema(rpc as any)) as any,
        context: entry.context
      }
      schemasCache.set(rpc, schemas)
    }
    return schemas
  }

  type Client = {
    readonly id: number
    readonly schemas: Map<RequestId, Schemas>
  }
  const clients = new Map<number, Client>()

  const handleEncode = <A, R>(
    client: Client,
    requestId: RequestId,
    effect: Effect.Effect<A, ParseError, R>,
    onSuccess: (value: A) => any
  ) =>
    Effect.catchAllCause(
      Effect.flatMap(effect, (value) => transport.send(client.id, onSuccess(value))),
      (cause) => {
        client.schemas.delete(requestId)
        const _defect = Cause.squash(Cause.map(cause, TreeFormatter.formatErrorSync))
        // TODO
        return Effect.void
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
          const schemas = client.schemas.get(response.requestId)
          if (!schemas) return Effect.void
          return handleEncode(
            client,
            response.requestId,
            Effect.provide(schemas.encodeChunk(response.values), schemas.context),
            (results) =>
              results.map((result) => ({
                _tag: "Success",
                id: Number(response.requestId),
                method: "",
                result
              }))
          )
        }
        case "Exit": {
          const schemas = client.schemas.get(response.requestId)
          if (!schemas) return Effect.void
          client.schemas.delete(response.requestId)
          return handleEncode(
            client,
            response.requestId,
            Effect.provide(schemas.encodeExit(response.exit), schemas.context),
            (exit) => {
              if (exit._tag === "Success") {
                return {
                  _tag: "Success",
                  id: Number(response.requestId),
                  method: "",
                  result: exit.value
                }
              }
              // TODO
              return Effect.void
            }
          )
        }
        case "ClientEnd": {
          clients.delete(response.clientId)
          return transport.end(response.clientId)
        }
        case "Defect": {
          // TODO
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
        // TODO: send error
        return Effect.void
      }

      switch (request._tag) {
        case "Request": {
          const requestId = RequestId(typeof request.id === "string" ? request.id : BigInt(request.id))
          const schemas = getSchemas(rpc)
          return yield* Effect.matchEffect(
            Effect.provide(schemas.decode(request.payload), schemas.context),
            {
              onFailure: (_error) => {
                // TODO: send error
                return Effect.void
              },
              onSuccess: (payload) => {
                client.schemas.set(requestId, schemas)
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

export const layer = (
  serverInfo: Context.Tag.Service<McpServerImplementation>,
  options?: Context.Tag.Service<McpServerOptions>
) =>
  Layer.effect(McpServer, make).pipe(
    Layer.provide(ClientRpcs.toLayer(
      Effect.gen(function*() {
        const serverInfo = yield* McpServerImplementation
        const { capabilities = {} } = yield* McpServerOptions
        return {
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
          "notifications/initialized": () => Effect.void
          // TODO: remove
        } as any
      })
    )),
    Layer.provideMerge(Layer.succeed(McpServerImplementation, serverInfo)),
    Layer.provideMerge(Layer.succeed(McpServerOptions, options ?? {}))
  )

const MainLayer = layer({
  name: "Demo Server",
  version: "1.0.0"
}, {
  capabilities: {
    logging: {}
  }
}).pipe(
  Layer.provide(McpTransport.layerTransportStdio())
)

Layer.launch(MainLayer).pipe(
  Effect.runPromise
)
