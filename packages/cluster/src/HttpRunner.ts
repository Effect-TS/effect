/**
 * @since 1.0.0
 */
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpRouter from "@effect/platform/HttpLayerRouter"
import type * as HttpServer from "@effect/platform/HttpServer"
import type { HttpServerRequest } from "@effect/platform/HttpServerRequest"
import type { HttpServerResponse } from "@effect/platform/HttpServerResponse"
import * as Socket from "@effect/platform/Socket"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import type { MessageStorage } from "./MessageStorage.js"
import type { RunnerHealth } from "./RunnerHealth.js"
import * as Runners from "./Runners.js"
import { RpcClientProtocol } from "./Runners.js"
import * as RunnerServer from "./RunnerServer.js"
import type { RunnerStorage } from "./RunnerStorage.js"
import * as Sharding from "./Sharding.js"
import type * as ShardingConfig from "./ShardingConfig.js"

const normalizePath = (path: string): string => path.startsWith("/") ? path : `/${path}`

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocolHttp = (options: {
  readonly path: string
  readonly https?: boolean | undefined
}): Layer.Layer<
  RpcClientProtocol,
  never,
  RpcSerialization.RpcSerialization | HttpClient.HttpClient
> =>
  Layer.effect(RpcClientProtocol)(
    Effect.gen(function*() {
      const serialization = yield* RpcSerialization.RpcSerialization
      const client = yield* HttpClient.HttpClient
      const https = options.https ?? false
      return (address) => {
        const clientWithUrl = HttpClient.mapRequest(
          client,
          HttpClientRequest.prependUrl(
            `http${https ? "s" : ""}://${address.host}:${address.port}${normalizePath(options.path)}`
          )
        )
        return RpcClient.makeProtocolHttp(clientWithUrl).pipe(
          Effect.provideService(RpcSerialization.RpcSerialization, serialization)
        )
      }
    })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocolHttpDefault: Layer.Layer<
  Runners.RpcClientProtocol,
  never,
  RpcSerialization.RpcSerialization | HttpClient.HttpClient
> = layerClientProtocolHttp({ path: "/" })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocolWebsocket = (options: {
  readonly path: string
  readonly https?: boolean | undefined
}): Layer.Layer<
  RpcClientProtocol,
  never,
  RpcSerialization.RpcSerialization | Socket.WebSocketConstructor
> =>
  Layer.effect(RpcClientProtocol)(
    Effect.gen(function*() {
      const serialization = yield* RpcSerialization.RpcSerialization
      const https = options.https ?? false
      const constructor = yield* Socket.WebSocketConstructor
      return Effect.fnUntraced(function*(address) {
        const socket = yield* Socket.makeWebSocket(
          `ws${https ? "s" : ""}://${address.host}:${address.port}${normalizePath(options.path)}`
        ).pipe(
          Effect.provideService(Socket.WebSocketConstructor, constructor)
        )
        return yield* RpcClient.makeProtocolSocket().pipe(
          Effect.provideService(Socket.Socket, socket),
          Effect.provideService(RpcSerialization.RpcSerialization, serialization)
        )
      })
    })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocolWebsocketDefault: Layer.Layer<
  Runners.RpcClientProtocol,
  never,
  RpcSerialization.RpcSerialization | Socket.WebSocketConstructor
> = layerClientProtocolWebsocket({ path: "/" })

/**
 * @since 1.0.0
 * @category Http App
 */
export const toHttpEffect: Effect.Effect<
  Effect.Effect<HttpServerResponse, never, Scope | HttpServerRequest>,
  never,
  Scope | RpcSerialization.RpcSerialization | Sharding.Sharding | MessageStorage
> = Effect.gen(function*() {
  const handlers = yield* Layer.build(RunnerServer.layerHandlers)
  return yield* RpcServer.toHttpApp(Runners.Rpcs, {
    spanPrefix: "RunnerServer",
    disableTracing: true
  }).pipe(Effect.provide(handlers))
})

/**
 * @since 1.0.0
 * @category Http App
 */
export const toHttpEffectWebsocket: Effect.Effect<
  Effect.Effect<HttpServerResponse, never, Scope | HttpServerRequest>,
  never,
  Scope | RpcSerialization.RpcSerialization | Sharding.Sharding | MessageStorage
> = Effect.gen(function*() {
  const handlers = yield* Layer.build(RunnerServer.layerHandlers)
  return yield* RpcServer.toHttpAppWebsocket(Runners.Rpcs, {
    spanPrefix: "RunnerServer",
    disableTracing: true
  }).pipe(Effect.provide(handlers))
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClient: Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  ShardingConfig.ShardingConfig | Runners.RpcClientProtocol | MessageStorage | RunnerStorage | RunnerHealth
> = Sharding.layer.pipe(
  Layer.provideMerge(Runners.layerRpc)
)

/**
 * A HTTP layer for the `Runners` services, that adds a route to the provided
 * `HttpRouter`.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpOptions = (options: {
  readonly path: HttpRouter.PathInput
}): Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | RunnerStorage
  | RunnerHealth
  | RpcSerialization.RpcSerialization
  | MessageStorage
  | ShardingConfig.ShardingConfig
  | Runners.RpcClientProtocol
  | HttpRouter.HttpRouter
> =>
  RunnerServer.layerWithClients.pipe(
    Layer.provide(RpcServer.layerProtocolHttp(options))
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocketOptions = (options: {
  readonly path: HttpRouter.PathInput
}): Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | ShardingConfig.ShardingConfig
  | Runners.RpcClientProtocol
  | MessageStorage
  | RunnerStorage
  | RunnerHealth
  | RpcSerialization.RpcSerialization
  | HttpRouter.HttpRouter
> =>
  RunnerServer.layerWithClients.pipe(
    Layer.provide(RpcServer.layerProtocolWebsocket(options))
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttp: Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | HttpClient.HttpClient
  | HttpServer.HttpServer
  | MessageStorage
  | RunnerStorage
  | RunnerHealth
> = HttpRouter.serve(layerHttpOptions({ path: "/" })).pipe(
  Layer.provide(layerClientProtocolHttpDefault)
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpClientOnly: Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | HttpClient.HttpClient
  | MessageStorage
  | RunnerStorage
> = RunnerServer.layerClientOnly.pipe(
  Layer.provide(layerClientProtocolHttpDefault)
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocket: Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | Socket.WebSocketConstructor
  | HttpServer.HttpServer
  | MessageStorage
  | RunnerStorage
  | RunnerHealth
> = HttpRouter.serve(layerWebsocketOptions({ path: "/" })).pipe(
  Layer.provide(layerClientProtocolWebsocketDefault)
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocketClientOnly: Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | ShardingConfig.ShardingConfig
  | MessageStorage
  | RunnerStorage
  | RpcSerialization.RpcSerialization
  | Socket.WebSocketConstructor
> = RunnerServer.layerClientOnly.pipe(
  Layer.provide(layerClientProtocolWebsocketDefault)
)
