/**
 * @since 1.0.0
 */
import * as HttpRunner from "@effect/cluster/HttpRunner"
import * as MessageStorage from "@effect/cluster/MessageStorage"
import * as RunnerHealth from "@effect/cluster/RunnerHealth"
import * as Runners from "@effect/cluster/Runners"
import * as RunnerStorage from "@effect/cluster/RunnerStorage"
import type { Sharding } from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as SqlMessageStorage from "@effect/cluster/SqlMessageStorage"
import * as SqlRunnerStorage from "@effect/cluster/SqlRunnerStorage"
import type * as Etag from "@effect/platform/Etag"
import type { HttpPlatform } from "@effect/platform/HttpPlatform"
import type { HttpServer } from "@effect/platform/HttpServer"
import type { ServeError } from "@effect/platform/HttpServerError"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import type { SqlClient } from "@effect/sql/SqlClient"
import type { ConfigError } from "effect/ConfigError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { createServer } from "node:http"
import { layerK8sHttpClient } from "./NodeClusterSocket.js"
import type { NodeContext } from "./NodeContext.js"
import * as NodeHttpClient from "./NodeHttpClient.js"
import * as NodeHttpServer from "./NodeHttpServer.js"
import * as NodeSocket from "./NodeSocket.js"

export {
  /**
   * @since 1.0.0
   * @category Re-exports
   */
  layerK8sHttpClient
} from "./NodeClusterSocket.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = <
  const ClientOnly extends boolean = false,
  const Storage extends "local" | "sql" | "byo" = never,
  const Health extends "ping" | "k8s" = never
>(options: {
  readonly transport: "http" | "websocket"
  readonly serialization?: "msgpack" | "ndjson" | undefined
  readonly clientOnly?: ClientOnly | undefined
  readonly storage?: Storage | undefined
  readonly runnerHealth?: Health | undefined
  readonly runnerHealthK8s?: {
    readonly namespace?: string | undefined
    readonly labelSelector?: string | undefined
  } | undefined
  readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig["Type"]> | undefined
}): ClientOnly extends true ? Layer.Layer<
    Sharding | Runners.Runners | ("byo" extends Storage ? never : MessageStorage.MessageStorage),
    ConfigError,
    "local" extends Storage ? never
      : "byo" extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage)
      : SqlClient
  > :
  Layer.Layer<
    Sharding | Runners.Runners | ("byo" extends Storage ? never : MessageStorage.MessageStorage),
    ServeError | ConfigError,
    "local" extends Storage ? never
      : "byo" extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage)
      : SqlClient
  > =>
{
  const layer: Layer.Layer<any, any, any> = options.clientOnly
    // client only
    ? options.transport === "http"
      ? Layer.provide(HttpRunner.layerHttpClientOnly, NodeHttpClient.layerUndici)
      : Layer.provide(HttpRunner.layerWebsocketClientOnly, NodeSocket.layerWebSocketConstructor)
    // with server
    : options.transport === "http"
    ? Layer.provide(HttpRunner.layerHttp, [layerHttpServer, NodeHttpClient.layerUndici])
    : Layer.provide(HttpRunner.layerWebsocket, [layerHttpServer, NodeSocket.layerWebSocketConstructor])

  const runnerHealth: Layer.Layer<any, any, any> = options?.clientOnly
    ? Layer.empty as any
    : options?.runnerHealth === "k8s"
    ? RunnerHealth.layerK8s(options.runnerHealthK8s).pipe(
      Layer.provide(layerK8sHttpClient)
    )
    : RunnerHealth.layerPing.pipe(
      Layer.provide(Runners.layerRpc),
      Layer.provide(
        options.transport === "http"
          ? HttpRunner.layerClientProtocolHttpDefault.pipe(Layer.provide(NodeHttpClient.layerUndici))
          : HttpRunner.layerClientProtocolWebsocketDefault.pipe(Layer.provide(NodeSocket.layerWebSocketConstructor))
      )
    )

  return layer.pipe(
    Layer.provide(runnerHealth),
    Layer.provideMerge(
      options?.storage === "local"
        ? MessageStorage.layerNoop
        : options?.storage === "byo"
        ? Layer.empty
        : Layer.orDie(SqlMessageStorage.layer)
    ),
    Layer.provide(
      options?.storage === "local"
        ? RunnerStorage.layerMemory
        : options?.storage === "byo"
        ? Layer.empty
        : Layer.orDie(SqlRunnerStorage.layer)
    ),
    Layer.provide(ShardingConfig.layerFromEnv(options?.shardingConfig)),
    Layer.provide(
      options?.serialization === "ndjson" ? RpcSerialization.layerNdjson : RpcSerialization.layerMsgPack
    )
  ) as any
}

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpServer: Layer.Layer<
  | HttpPlatform
  | Etag.Generator
  | NodeContext
  | HttpServer,
  ServeError,
  ShardingConfig.ShardingConfig
> = Effect.gen(function*() {
  const config = yield* ShardingConfig.ShardingConfig
  const listenAddress = Option.orElse(config.runnerListenAddress, () => config.runnerAddress)
  if (listenAddress._tag === "None") {
    return yield* Effect.die("NodeClusterHttp.layerHttpServer: ShardingConfig.runnerAddress is None")
  }
  return NodeHttpServer.layer(createServer, listenAddress.value)
}).pipe(Layer.unwrapEffect)
