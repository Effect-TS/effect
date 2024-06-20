import * as PodsRpc from "@effect/cluster-node/PodsRpc"
import type * as ShardingServiceRpc from "@effect/cluster-node/ShardingServiceRpc"
import * as ShardManagerServiceRpc from "@effect/cluster-node/ShardManagerServiceRpc"
import * as StorageFile from "@effect/cluster-node/StorageFile"
import * as ManagerConfig from "@effect/cluster/ManagerConfig"
import * as PodsHealth from "@effect/cluster/PodsHealth"
import * as ShardManager from "@effect/cluster/ShardManager"
import { HttpClient, HttpClientRequest, HttpMiddleware, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Resolver } from "@effect/rpc"
import { HttpResolver, HttpRouter as RpcHttpRouter } from "@effect/rpc-http"
import { Context, Effect, Layer, Logger, LogLevel } from "effect"
import { createServer } from "node:http"

const HttpLive = Layer.flatMap(
  Layer.effect(ManagerConfig.ManagerConfig, ManagerConfig.ManagerConfig),
  (config) =>
    HttpRouter.empty.pipe(
      HttpRouter.post("/api/rest", RpcHttpRouter.toHttpApp(ShardManagerServiceRpc.router)),
      HttpServer.serve(HttpMiddleware.logger),
      HttpServer.withLogAddress,
      Layer.provide(
        NodeHttpServer.layer(createServer, {
          port: Context.get(config, ManagerConfig.ManagerConfig).apiPort
        })
      ),
      Layer.discard
    )
)

const liveShardingManager = Effect.never.pipe(
  Layer.scopedDiscard,
  Layer.provide(HttpLive),
  Layer.provide(ShardManager.live),
  Layer.provide(StorageFile.storageFile),
  Layer.provide(PodsHealth.local),
  Layer.provide(PodsRpc.podsRpc<never>((podAddress) =>
    HttpResolver.make<ShardingServiceRpc.ShardingServiceRpc>(
      HttpClient.fetchOk.pipe(
        HttpClient.mapRequest(
          HttpClientRequest.prependUrl(`http://${podAddress.host}:${podAddress.port}/api/rest`)
        )
      )
    ).pipe(Resolver.toClient)
  )),
  Layer.provide(ManagerConfig.fromConfig),
  Layer.provide(HttpClient.layer)
)

Layer.launch(liveShardingManager).pipe(
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
