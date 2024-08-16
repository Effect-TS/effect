/**
 * @since 1.0.0
 */
import * as HttpPods from "@effect/cluster/HttpPods"
import * as MessageStorage from "@effect/cluster/MessageStorage"
import type * as Pods from "@effect/cluster/Pods"
import type { Sharding } from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardStorage from "@effect/cluster/ShardStorage"
import * as SqlMessageStorage from "@effect/cluster/SqlMessageStorage"
import * as SqlShardStorage from "@effect/cluster/SqlShardStorage"
import type * as Etag from "@effect/platform/Etag"
import type { HttpPlatform } from "@effect/platform/HttpPlatform"
import type { HttpServer } from "@effect/platform/HttpServer"
import type { ServeError } from "@effect/platform/HttpServerError"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import type { SqlClient } from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { ConfigError } from "effect/ConfigError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { createServer } from "node:http"
import type { NodeContext } from "./NodeContext.js"
import * as NodeHttpClient from "./NodeHttpClient.js"
import * as NodeHttpServer from "./NodeHttpServer.js"
import * as NodeSocket from "./NodeSocket.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = <
  const ClientOnly extends boolean = false,
  const Storage extends "noop" | "sql" = "noop"
>(options: {
  readonly transport: "http" | "websocket"
  readonly serialization?: "msgpack" | "ndjson" | undefined
  readonly clientOnly?: ClientOnly | undefined
  readonly storage?: Storage | undefined
  readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig["Type"]> | undefined
}): ClientOnly extends true ? Layer.Layer<
    Sharding | Pods.Pods,
    ConfigError | (Storage extends "sql" ? SqlError : never),
    Storage extends "sql" ? SqlClient : never
  > :
  Layer.Layer<
    Sharding | Pods.Pods,
    ServeError | ConfigError | (Storage extends "sql" ? SqlError : never),
    Storage extends "sql" ? SqlClient : never
  > =>
{
  const layer: Layer.Layer<any, any, any> = options.clientOnly
    // client only
    ? options.transport === "http"
      ? Layer.provide(HttpPods.layerHttpClientOnly, NodeHttpClient.layerUndici)
      : Layer.provide(HttpPods.layerWebsocketClientOnly, NodeSocket.layerWebSocketConstructor)
    // with server
    : options.transport === "http"
    ? Layer.provide(HttpPods.layerHttp, [layerHttpServer, NodeHttpClient.layerUndici])
    : Layer.provide(HttpPods.layerWebsocket, [layerHttpServer, NodeSocket.layerWebSocketConstructor])

  return layer.pipe(
    Layer.provide(
      options?.storage === "sql"
        ? options.clientOnly ? [SqlMessageStorage.layer] : [SqlMessageStorage.layer, SqlShardStorage.layer]
        : [MessageStorage.layerNoop, ShardStorage.layerNoop]
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
  if (Option.isNone(config.podAddress)) {
    return yield* Effect.dieMessage("NodeClusterHttpPods.layerHttpServer: ShardingConfig.podAddress is None")
  }
  return NodeHttpServer.layer(createServer, config.podAddress.value)
}).pipe(Layer.unwrapEffect)
