import * as PodsRpc from "@effect/cluster-node/PodsRpc"
import * as ShardingServiceRpc from "@effect/cluster-node/ShardingServiceRpc"
import * as ShardManagerClientRpc from "@effect/cluster-node/ShardManagerClientRpc"
import * as StorageFile from "@effect/cluster-node/StorageFile"
import * as MessageState from "@effect/cluster/MessageState"
import * as RecipientBehaviour from "@effect/cluster/RecipientBehaviour"
import * as Serialization from "@effect/cluster/Serialization"
import * as Sharding from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import { HttpClient, HttpClientRequest, HttpMiddleware, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpClient, NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { RpcResolver } from "@effect/rpc"
import { HttpRpcResolver, HttpRpcRouter } from "@effect/rpc-http"
import { Context, Effect, Exit, Layer, Logger, LogLevel, Ref } from "effect"
import { createServer } from "node:http"
import { CounterEntity } from "./sample-common.js"

const HttpLive = Layer.flatMap(
  Layer.effect(ShardingConfig.ShardingConfig, ShardingConfig.ShardingConfig),
  (config) =>
    HttpRouter.empty.pipe(
      HttpRouter.post("/api/rest", HttpRpcRouter.toHttpApp(ShardingServiceRpc.router)),
      HttpServer.serve(HttpMiddleware.logger),
      HttpServer.withLogAddress,
      Layer.provide(
        NodeHttpServer.layer(createServer, {
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
          return Ref.update(stateRef, (count) => count + 1).pipe(
            Effect.zipLeft(Effect.logInfo(`Counter ${entityId} incremented`)),
            Effect.as(MessageState.Processed(Exit.void))
          )
        case "Decrement":
          return Ref.update(stateRef, (count) => count - 1).pipe(
            Effect.zipLeft(Effect.logInfo(`Counter ${entityId} decremented`)),
            Effect.as(MessageState.Processed(Exit.void))
          )
        case "GetCurrent":
          return Ref.get(stateRef).pipe(
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
  Layer.provide(Layer.unwrapEffect(Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    return PodsRpc.podsRpc<never>((podAddress) =>
      HttpRpcResolver.make<ShardingServiceRpc.ShardingServiceRpc>(
        client.pipe(
          HttpClient.filterStatusOk,
          HttpClient.mapRequest(
            HttpClientRequest.prependUrl(`http://${podAddress.host}:${podAddress.port}/api/rest`)
          )
        )
      ).pipe(RpcResolver.toClient)
    )
  }))),
  Layer.provide(Layer.unwrapEffect(Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    return ShardManagerClientRpc.shardManagerClientRpc(
      (shardManagerUri) =>
        HttpRpcResolver.make<ShardingServiceRpc.ShardingServiceRpc>(
          client.pipe(
            HttpClient.filterStatusOk,
            HttpClient.mapRequest(
              HttpClientRequest.prependUrl(shardManagerUri)
            )
          )
        ).pipe(RpcResolver.toClient)
    )
  }))),
  Layer.provide(Serialization.json),
  Layer.provide(NodeHttpClient.layerUndici),
  Layer.provide(ShardingConfig.fromConfig)
)

Layer.launch(liveLayer).pipe(
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
