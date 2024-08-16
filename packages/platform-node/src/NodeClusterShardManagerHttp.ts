/**
 * @since 1.0.0
 */
import * as HttpShardManager from "@effect/cluster/HttpShardManager"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardManager from "@effect/cluster/ShardManager"
import * as ShardStorage from "@effect/cluster/ShardStorage"
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
import { createServer } from "node:http"
import type { NodeContext } from "./NodeContext.js"
import * as NodeHttpClient from "./NodeHttpClient.js"
import * as NodeHttpServer from "./NodeHttpServer.js"
import * as NodeSocket from "./NodeSocket.js"

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
  return NodeHttpServer.layer(createServer, config.shardManagerAddress)
}).pipe(Layer.unwrapEffect)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = <const Storage extends "sql" | "noop" = "noop">(options: {
  readonly protocol: "http" | "websocket"
  readonly serialization?: "msgpack" | "ndjson" | undefined
  readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig["Type"]> | undefined
  readonly storage?: Storage | undefined
}): Layer.Layer<
  ShardManager.ShardManager,
  ServeError | ConfigError | (Storage extends "sql" ? SqlError : never),
  Storage extends "sql" ? SqlClient : never
> => {
  const layer: Layer.Layer<any, any, any> = options.protocol === "http" ?
    HttpShardManager.layerHttp.pipe(
      Layer.provide([HttpShardManager.layerRunnerHealthHttp, layerHttpServer]),
      Layer.provide(NodeHttpClient.layerUndici)
    ) :
    HttpShardManager.layerWebsocket.pipe(
      Layer.provide([HttpShardManager.layerRunnerHealthWebsocket, layerHttpServer]),
      Layer.provide(NodeSocket.layerWebSocketConstructor)
    )
  return layer.pipe(
    Layer.provide(options?.storage === "sql" ? SqlShardStorage.layer : ShardStorage.layerNoop),
    Layer.provide([
      ShardingConfig.layerFromEnv(options.shardingConfig),
      ShardManager.layerConfigFromEnv,
      options?.serialization === "ndjson" ? RpcSerialization.layerNdjson : RpcSerialization.layerMsgPack
    ])
  )
}
