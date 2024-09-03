import * as PodsRpc from "@effect/cluster-node/PodsRpc"
import type * as ShardingServiceRpc from "@effect/cluster-node/ShardingServiceRpc"
import * as ShardManagerClientRpc from "@effect/cluster-node/ShardManagerClientRpc"
import * as StorageFile from "@effect/cluster-node/StorageFile"
import * as Serialization from "@effect/cluster/Serialization"
import * as Sharding from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import { HttpClient, HttpClientRequest } from "@effect/platform"
import { NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { RpcResolver } from "@effect/rpc"
import { HttpRpcResolver } from "@effect/rpc-http"
import { Effect, Layer, Logger, LogLevel, Ref } from "effect"
import { CounterEntity, GetCurrent, Increment } from "./sample-common.js"

const liveLayer = Effect.gen(function*() {
  const messenger = yield* Sharding.messenger(CounterEntity)
  const idRef = yield* Ref.make(0)

  while (true) {
    const id = yield* Ref.getAndUpdate(idRef, (_) => _ + 1)
    const entityId = `entity-${id % 10}`

    yield* messenger.sendDiscard(entityId)(new Increment({ messageId: `increment-${id}` }))
    const result = yield* messenger.send(entityId)(new GetCurrent({ messageId: `get-count-${id}` }))
    yield* Effect.logInfo(`Counter ${entityId} is now: ${result}`)

    yield* Effect.sleep(200)
  }
}).pipe(
  Layer.effectDiscard,
  Layer.provide(Sharding.live),
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
  Layer.provide(ShardingConfig.withDefaults({ shardingPort: 54322 })),
  Layer.provide(Serialization.json),
  Layer.provide(NodeHttpClient.layerUndici)
)

Layer.launch(liveLayer).pipe(
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
