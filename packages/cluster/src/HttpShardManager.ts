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
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import { layerClientProtocolHttp, layerClientProtocolWebsocket } from "./HttpCommon.js"
import * as MessageStorage from "./MessageStorage.js"
import * as Pods from "./Pods.js"
import * as PodsHealth from "./PodsHealth.js"
import type { ShardingConfig } from "./ShardingConfig.js"
import * as ShardManager from "./ShardManager.js"
import type { ShardStorage } from "./ShardStorage.js"

/**
 * @since 1.0.0
 * @category Http App
 */
export const toHttpApp: Effect.Effect<
  HttpApp.Default<never, Scope>,
  never,
  Scope | RpcSerialization.RpcSerialization | ShardManager.ShardManager
> = Effect.gen(function*() {
  const handlers = yield* Layer.build(ShardManager.layerServerHandlers)
  return yield* RpcServer.toHttpApp(ShardManager.ShardManagerRpcs).pipe(
    Effect.provide(handlers)
  )
})

/**
 * @since 1.0.0
 * @category Http App
 */
export const toHttpAppWebsocket: Effect.Effect<
  HttpApp.Default<never, Scope>,
  never,
  Scope | RpcSerialization.RpcSerialization | ShardManager.ShardManager
> = Effect.gen(function*() {
  const handlers = yield* Layer.build(ShardManager.layerServerHandlers)
  return yield* RpcServer.toHttpAppWebsocket(ShardManager.ShardManagerRpcs).pipe(
    Effect.provide(handlers)
  )
})

/**
 * A layer for the `ShardManager` service, that does not run a server.
 *
 * It only provides the `Pods` rpc client.
 *
 * You can use this with the `toHttpApp` and `toHttpAppWebsocket` apis
 * to run a complete `ShardManager` server.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerNoServerHttp = (
  options: {
    readonly podsPath: string
    readonly podsHttps?: boolean | undefined
  }
): Layer.Layer<
  ShardManager.ShardManager,
  never,
  | RpcSerialization.RpcSerialization
  | ShardStorage
  | PodsHealth.PodsHealth
  | HttpClient.HttpClient
  | ShardManager.Config
  | ShardingConfig
> =>
  ShardManager.layer.pipe(
    Layer.provide(Pods.layerRpc.pipe(
      Layer.provide([
        layerClientProtocolHttp({
          path: options.podsPath,
          https: options.podsHttps
        }),
        MessageStorage.layerNoop
      ])
    ))
  )

/**
 * A layer for the `ShardManager` service, that does not run a server.
 *
 * It only provides the `Pods` rpc client.
 *
 * You can use this with the `toHttpApp` and `toHttpAppWebsocket` apis
 * to run a complete `ShardManager` server.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerNoServerWebsocket = (
  options: {
    readonly podsPath: string
    readonly podsHttps?: boolean | undefined
  }
): Layer.Layer<
  ShardManager.ShardManager,
  never,
  | RpcSerialization.RpcSerialization
  | ShardStorage
  | PodsHealth.PodsHealth
  | Socket.WebSocketConstructor
  | ShardManager.Config
  | ShardingConfig
> =>
  ShardManager.layer.pipe(
    Layer.provide(Pods.layerRpc.pipe(
      Layer.provide([
        layerClientProtocolWebsocket({
          path: options.podsPath,
          https: options.podsHttps
        }),
        MessageStorage.layerNoop
      ])
    ))
  )

/**
 * A HTTP layer for the `ShardManager` server, that adds a route to the provided
 * `HttpRouter.Tag`.
 *
 * By default, it uses the `HttpRouter.Default` tag.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpOptions = <I = HttpRouter.Default>(
  options: {
    readonly path: HttpRouter.PathInput
    readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
    readonly podsPath: string
    readonly podsHttps?: boolean | undefined
    readonly logAddress?: boolean | undefined
  }
): Layer.Layer<
  ShardManager.ShardManager,
  never,
  | RpcSerialization.RpcSerialization
  | ShardStorage
  | PodsHealth.PodsHealth
  | HttpClient.HttpClient
  | HttpServer.HttpServer
  | ShardManager.Config
  | ShardingConfig
> => {
  const routerTag = options.routerTag ?? HttpRouter.Default
  return routerTag.serve().pipe(
    options.logAddress ? withLogAddress : identity,
    Layer.merge(ShardManager.layerServer),
    Layer.provide(RpcServer.layerProtocolHttp(options)),
    Layer.provideMerge(layerNoServerHttp(options))
  )
}

/**
 * A WebSocket layer for the `ShardManager` server, that adds a route to the provided
 * `HttpRouter.Tag`.
 *
 * By default, it uses the `HttpRouter.Default` tag.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocketOptions = <I = HttpRouter.Default>(
  options: {
    readonly path: HttpRouter.PathInput
    readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
    readonly podsPath: string
    readonly podsHttps?: boolean | undefined
    readonly logAddress?: boolean | undefined
  }
): Layer.Layer<
  ShardManager.ShardManager,
  never,
  | RpcSerialization.RpcSerialization
  | ShardStorage
  | PodsHealth.PodsHealth
  | HttpServer.HttpServer
  | Socket.WebSocketConstructor
  | ShardManager.Config
  | ShardingConfig
> => {
  const routerTag = options.routerTag ?? HttpRouter.Default
  return routerTag.serve().pipe(
    options.logAddress ? withLogAddress : identity,
    Layer.merge(ShardManager.layerServer),
    Layer.provide(RpcServer.layerProtocolWebsocket(options)),
    Layer.provideMerge(layerNoServerWebsocket(options))
  )
}

const withLogAddress = <A, E, R>(layer: Layer.Layer<A, E, R>): Layer.Layer<A, E, R | HttpServer.HttpServer> =>
  Layer.effectDiscard(
    HttpServer.addressFormattedWith((address) =>
      Effect.annotateLogs(Effect.logInfo(`Listening on: ${address}`), {
        package: "@effect/cluster",
        service: "ShardManager"
      })
    )
  ).pipe(Layer.provideMerge(layer))

/**
 * A HTTP layer for the `ShardManager` server, that adds a route to the provided
 * `HttpRouter.Tag`.
 *
 * By default, it uses the `HttpRouter.Default` tag.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerHttp: Layer.Layer<
  ShardManager.ShardManager,
  never,
  | RpcSerialization.RpcSerialization
  | ShardStorage
  | PodsHealth.PodsHealth
  | HttpClient.HttpClient
  | HttpServer.HttpServer
  | ShardManager.Config
  | ShardingConfig
> = layerHttpOptions({ path: "/", podsPath: "/" })

/**
 * A Websocket layer for the `ShardManager` server, that adds a route to the provided
 * `HttpRouter.Tag`.
 *
 * By default, it uses the `HttpRouter.Default` tag.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerWebsocket: Layer.Layer<
  ShardManager.ShardManager,
  never,
  | RpcSerialization.RpcSerialization
  | ShardStorage
  | PodsHealth.PodsHealth
  | Socket.WebSocketConstructor
  | HttpServer.HttpServer
  | ShardManager.Config
  | ShardingConfig
> = layerWebsocketOptions({ path: "/", podsPath: "/" })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerPodsHealthHttp: Layer.Layer<
  PodsHealth.PodsHealth,
  never,
  RpcSerialization.RpcSerialization | HttpClient.HttpClient | ShardingConfig
> = Layer.provide(PodsHealth.layerRpc, layerClientProtocolHttp({ path: "/" }))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerPodsHealthWebsocket: Layer.Layer<
  PodsHealth.PodsHealth,
  never,
  RpcSerialization.RpcSerialization | Socket.WebSocketConstructor | ShardingConfig
> = Layer.provide(PodsHealth.layerRpc, layerClientProtocolWebsocket({ path: "/" }))
