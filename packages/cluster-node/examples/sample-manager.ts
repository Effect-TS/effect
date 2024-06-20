import * as PodsRpc from "@effect/cluster-node/PodsRpc"
import type * as ShardingServiceRpc from "@effect/cluster-node/ShardingServiceRpc"
import * as ShardManagerServiceRpc from "@effect/cluster-node/ShardManagerServiceRpc"
import * as StorageFile from "@effect/cluster-node/StorageFile"
import * as ManagerConfig from "@effect/cluster/ManagerConfig"
import * as PodsHealth from "@effect/cluster/PodsHealth"
import * as ShardManager from "@effect/cluster/ShardManager"
import { NodeHttpServer } from "@effect/platform-node"
import { runMain } from "@effect/platform-node/NodeRuntime"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpServer from "@effect/platform/HttpServer"
import { Resolver } from "@effect/rpc"
import { HttpResolver, HttpRouter } from "@effect/rpc-http"
import { Context } from "effect"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import { createServer } from "node:http"

const HttpLive = Layer.flatMap(
  Layer.effect(ManagerConfig.ManagerConfig, ManagerConfig.ManagerConfig),
  (config) =>
    HttpServer.router.empty.pipe(
      HttpServer.router.post("/api/rest", HttpRouter.toHttpApp(ShardManagerServiceRpc.router)),
      HttpServer.server.serve(HttpServer.middleware.logger),
      HttpServer.server.withLogAddress,
      Layer.provide(
        NodeHttpServer.server.layer(createServer, {
          port: Context.get(config, ManagerConfig.ManagerConfig).apiPort
        })
      ),
      Layer.discard
    )
)

const liveShardingManager = pipe(
  Effect.never,
  Layer.scopedDiscard,
  Layer.provide(HttpLive),
  Layer.provide(ShardManager.live),
  Layer.provide(StorageFile.storageFile),
  Layer.provide(PodsHealth.local),
  Layer.provide(PodsRpc.podsRpc<never>((podAddress) =>
    HttpResolver.make<ShardingServiceRpc.ShardingServiceRpc>(
      HttpClient.client.fetchOk.pipe(
        HttpClient.client.mapRequest(
          HttpClient.request.prependUrl(`http://${podAddress.host}:${podAddress.port}/api/rest`)
        )
      )
    ).pipe(Resolver.toClient)
  )),
  Layer.provide(ManagerConfig.fromConfig),
  Layer.provide(HttpClient.client.layer)
)

Layer.launch(liveShardingManager).pipe(
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.tapErrorCause(Effect.logError),
  runMain
)
