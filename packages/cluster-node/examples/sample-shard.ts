import * as PodsRpc from "@effect/cluster-node/PodsRpc"
import * as ShardingServiceRpc from "@effect/cluster-node/ShardingServiceRpc"
import * as ShardManagerClientRpc from "@effect/cluster-node/ShardManagerClientRpc"
import * as StorageFile from "@effect/cluster-node/StorageFile"
import * as MessageState from "@effect/cluster/MessageState"
import * as RecipientBehaviour from "@effect/cluster/RecipientBehaviour"
import * as Serialization from "@effect/cluster/Serialization"
import * as Sharding from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import { NodeHttpServer } from "@effect/platform-node"
import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import { runMain } from "@effect/platform-node/NodeRuntime"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpServer from "@effect/platform/HttpServer"
import { Resolver } from "@effect/rpc"
import { HttpResolver, HttpRouter } from "@effect/rpc-http"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Ref from "effect/Ref"
import { createServer } from "node:http"
import { CounterEntity } from "./sample-common.js"

const HttpLive = Layer.flatMap(
  Layer.effect(ShardingConfig.ShardingConfig, ShardingConfig.ShardingConfig),
  (config) =>
    HttpServer.router.empty.pipe(
      HttpServer.router.post("/api/rest", HttpRouter.toHttpApp(ShardingServiceRpc.router)),
      HttpServer.server.serve(HttpServer.middleware.logger),
      HttpServer.server.withLogAddress,
      Layer.provide(
        NodeHttpServer.server.layer(createServer, {
          port: Context.get(config, ShardingConfig.ShardingConfig).shardingPort
        })
      ),
      Layer.discard
    )
)

const liveLayer = Sharding.registerEntity(
  CounterEntity
)(
  RecipientBehaviour.fromFunctionEffectStateful(
    () => Effect.succeed(0),
    (entityId, message, stateRef) => {
      switch (message._tag) {
        case "Increment":
          return pipe(
            Ref.update(stateRef, (count) => count + 1),
            Effect.zipLeft(Effect.logInfo(`Counter ${entityId} incremented`)),
            Effect.as(MessageState.Processed(Exit.void))
          )
        case "Decrement":
          return pipe(
            Ref.update(stateRef, (count) => count - 1),
            Effect.zipLeft(Effect.logInfo(`Counter ${entityId} decremented`)),
            Effect.as(MessageState.Processed(Exit.void))
          )
        case "GetCurrent":
          return pipe(
            Ref.get(stateRef),
            Effect.exit,
            Effect.map((result) => MessageState.Processed(result))
          )
      }
    }
  )
).pipe(
  Effect.zipRight(Sharding.registerScoped),
  Layer.scopedDiscard,
  Layer.provide(HttpLive),
  Layer.provideMerge(Sharding.live),
  Layer.provide(StorageFile.storageFile),
  Layer.provide(PodsRpc.podsRpc<never>((podAddress) =>
    HttpResolver.make<ShardingServiceRpc.ShardingServiceRpc>(
      HttpClient.client.fetchOk.pipe(
        HttpClient.client.mapRequest(
          HttpClient.request.prependUrl(`http://${podAddress.host}:${podAddress.port}/api/rest`)
        )
      )
    ).pipe(Resolver.toClient)
  )),
  Layer.provide(ShardManagerClientRpc.shardManagerClientRpc(
    (shardManagerUri) =>
      HttpResolver.make<ShardingServiceRpc.ShardingServiceRpc>(
        HttpClient.client.fetchOk.pipe(
          HttpClient.client.mapRequest(
            HttpClient.request.prependUrl(shardManagerUri)
          )
        )
      ).pipe(Resolver.toClient)
  )),
  Layer.provide(Serialization.json),
  Layer.provide(NodeClient.layer),
  Layer.provide(ShardingConfig.fromConfig)
)

Layer.launch(liveLayer).pipe(
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.tapErrorCause(Effect.logError),
  runMain
)
