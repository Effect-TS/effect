/**
 * @since 1.0.0
 */
import * as HttpRunner from "@effect/cluster/HttpRunner"
import * as MessageStorage from "@effect/cluster/MessageStorage"
import type * as Runners from "@effect/cluster/Runners"
import type { Sharding } from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardStorage from "@effect/cluster/ShardStorage"
import * as SqlMessageStorage from "@effect/cluster/SqlMessageStorage"
import * as SqlShardStorage from "@effect/cluster/SqlShardStorage"
import type * as Etag from "@effect/platform/Etag"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
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
import type { BunContext } from "./BunContext.js"
import * as BunHttpServer from "./BunHttpServer.js"
import * as BunSocket from "./BunSocket.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpServer: Layer.Layer<
  | HttpPlatform
  | Etag.Generator
  | BunContext
  | HttpServer,
  ServeError,
  ShardingConfig.ShardingConfig
> = Effect.gen(function*() {
  const config = yield* ShardingConfig.ShardingConfig
  const listenAddress = config.runnerListenAddress.pipe(
    Option.orElse(() => config.runnerAddress)
  )
  if (Option.isNone(listenAddress)) {
    return yield* Effect.dieMessage("BunClusterHttpRunners.layerHttpServer: ShardingConfig.runnerAddress is None")
  }
  return BunHttpServer.layer(listenAddress.value)
}).pipe(Layer.unwrapEffect)

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
    Sharding | Runners.Runners,
    ConfigError | (Storage extends "sql" ? SqlError : never),
    Storage extends "sql" ? SqlClient : never
  > :
  Layer.Layer<
    Sharding | Runners.Runners,
    ServeError | ConfigError | (Storage extends "sql" ? SqlError : never),
    Storage extends "sql" ? SqlClient : never
  > =>
{
  const layer: Layer.Layer<any, any, any> = options.clientOnly
    // client only
    ? options.transport === "http"
      ? Layer.provide(HttpRunner.layerHttpClientOnly, FetchHttpClient.layer)
      : Layer.provide(HttpRunner.layerWebsocketClientOnly, BunSocket.layerWebSocketConstructor)
    // with server
    : options.transport === "http"
    ? Layer.provide(HttpRunner.layerHttp, [layerHttpServer, FetchHttpClient.layer])
    : Layer.provide(HttpRunner.layerWebsocket, [layerHttpServer, BunSocket.layerWebSocketConstructor])

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
