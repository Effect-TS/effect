/**
 * @since 1.0.0
 */
import type * as HttpApp from "@effect/platform/HttpApp"
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServer from "@effect/platform/HttpServer"
import type * as Socket from "@effect/platform/Socket"
import type * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import { layerClientProtocolHttp, layerClientProtocolWebsocket } from "./HttpCommon.js"
import type { MessageStorage } from "./MessageStorage.js"
import * as Pods from "./Pods.js"
import * as PodsServer from "./PodsServer.js"
import * as Sharding from "./Sharding.js"
import type * as ShardingConfig from "./ShardingConfig.js"
import * as ShardManager from "./ShardManager.js"
import type { ShardStorage } from "./ShardStorage.js"
import * as SynchronizedClock from "./SynchronizedClock.js"

/**
 * @since 1.0.0
 * @category Http App
 */
export const toHttpApp: Effect.Effect<
  HttpApp.Default<never, Scope>,
  never,
  Scope | Sharding.Sharding | RpcSerialization.RpcSerialization | MessageStorage
> = Effect.gen(function*() {
  const handlers = yield* Layer.build(PodsServer.layerHandlers)
  return yield* RpcServer.toHttpApp(Pods.PodsRpcs, {
    spanPrefix: "PodsServer",
    disableSpanPropagation: true
  }).pipe(Effect.provide(handlers))
})

/**
 * @since 1.0.0
 * @category Http App
 */
export const toHttpAppWebsocket: Effect.Effect<
  HttpApp.Default<never, Scope>,
  never,
  Scope | Sharding.Sharding | RpcSerialization.RpcSerialization | MessageStorage
> = Effect.gen(function*() {
  const handlers = yield* Layer.build(PodsServer.layerHandlers)
  return yield* RpcServer.toHttpAppWebsocket(Pods.PodsRpcs, {
    spanPrefix: "PodsServer",
    disableSpanPropagation: true
  }).pipe(
    Effect.provide(handlers)
  )
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClient: Layer.Layer<
  Sharding.Sharding | Pods.Pods,
  never,
  ShardingConfig.ShardingConfig | Pods.RpcClientProtocol | MessageStorage | ShardStorage
> = Sharding.layer.pipe(
  Layer.provideMerge(Pods.layerRpc),
  Layer.provideMerge(SynchronizedClock.layer),
  Layer.provide(ShardManager.layerClientRpc)
)

/**
 * A HTTP layer for the `Pods` services, that adds a route to the provided
 * `HttpRouter.Tag`.
 *
 * By default, it uses the `HttpRouter.Default` tag.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layer = <I = HttpRouter.Default>(options: {
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
  readonly logAddress?: boolean | undefined
}): Layer.Layer<
  Sharding.Sharding | Pods.Pods,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | Pods.RpcClientProtocol
  | HttpServer.HttpServer
  | MessageStorage
  | ShardStorage
> => {
  const layer = PodsServer.layerWithClients.pipe(
    Layer.provide(RpcServer.layerProtocolHttp(options))
  )
  return options.logAddress ? withLogAddress(layer) : layer
}

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocketOptions = <I = HttpRouter.Default>(options: {
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
  readonly logAddress?: boolean | undefined
}): Layer.Layer<
  Sharding.Sharding | Pods.Pods,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | Pods.RpcClientProtocol
  | HttpServer.HttpServer
  | MessageStorage
  | ShardStorage
> => {
  const layer = PodsServer.layerWithClients.pipe(
    Layer.provide(RpcServer.layerProtocolWebsocket(options))
  )
  return options.logAddress ? withLogAddress(layer) : layer
}

const withLogAddress = <A, E, R>(layer: Layer.Layer<A, E, R>): Layer.Layer<A, E, R | HttpServer.HttpServer> =>
  Layer.effectDiscard(
    HttpServer.addressFormattedWith((address) =>
      Effect.annotateLogs(Effect.logInfo(`Listening on: ${address}`), {
        package: "@effect/cluster",
        service: "Pods"
      })
    )
  ).pipe(Layer.provideMerge(layer))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttp: Layer.Layer<
  Sharding.Sharding | Pods.Pods,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | HttpClient.HttpClient
  | HttpServer.HttpServer
  | MessageStorage
  | ShardStorage
> = HttpRouter.Default.serve().pipe(
  Layer.provideMerge(layer({ path: "/", logAddress: true })),
  Layer.provide(layerClientProtocolHttp({ path: "/" }))
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpClientOnly: Layer.Layer<
  Sharding.Sharding | Pods.Pods,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | HttpClient.HttpClient
  | MessageStorage
> = PodsServer.layerClientOnly.pipe(
  Layer.provide(layerClientProtocolHttp({ path: "/" }))
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocket: Layer.Layer<
  Sharding.Sharding | Pods.Pods,
  never,
  | RpcSerialization.RpcSerialization
  | ShardingConfig.ShardingConfig
  | Socket.WebSocketConstructor
  | HttpServer.HttpServer
  | MessageStorage
  | ShardStorage
> = HttpRouter.Default.serve().pipe(
  Layer.provideMerge(layerWebsocketOptions({ path: "/", logAddress: true })),
  Layer.provide(layerClientProtocolWebsocket({ path: "/" }))
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocketClientOnly: Layer.Layer<
  Sharding.Sharding | Pods.Pods,
  never,
  ShardingConfig.ShardingConfig | MessageStorage | RpcSerialization.RpcSerialization | Socket.WebSocketConstructor
> = PodsServer.layerClientOnly.pipe(
  Layer.provide(layerClientProtocolWebsocket({ path: "/" }))
)
