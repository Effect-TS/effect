/**
 * @since 1.0.0
 */
import * as RunnerHealth from "@effect/cluster/RunnerHealth"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardManager from "@effect/cluster/ShardManager"
import * as ShardStorage from "@effect/cluster/ShardStorage"
import * as SocketShardManager from "@effect/cluster/SocketShardManager"
import * as SqlShardStorage from "@effect/cluster/SqlShardStorage"
import type * as SocketServer from "@effect/platform/SocketServer"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import type { SqlClient } from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { ConfigError } from "effect/ConfigError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { layerClientProtocol } from "./NodeClusterSocketCommon.js"
import * as NodeSocketServer from "./NodeSocketServer.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerSocketServer: Layer.Layer<
  SocketServer.SocketServer,
  SocketServer.SocketServerError,
  ShardingConfig.ShardingConfig
> = Effect.gen(function*() {
  const config = yield* ShardingConfig.ShardingConfig
  return NodeSocketServer.layer(config.shardManagerAddress)
}).pipe(Layer.unwrapEffect)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = <const Storage extends "sql" | "noop" = "noop">(options?: {
  readonly serialization?: "msgpack" | "ndjson" | undefined
  readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig["Type"]> | undefined
  readonly storage?: Storage | undefined
  readonly config?: Partial<ShardManager.Config["Type"]> | undefined
  readonly availableShardGroups?: ReadonlyArray<string> | undefined
}): Layer.Layer<
  ShardManager.ShardManager,
  SocketServer.SocketServerError | ConfigError | (Storage extends "sql" ? SqlError : never),
  Storage extends "sql" ? SqlClient : never
> =>
  SocketShardManager.layer.pipe(
    Layer.provide([
      RunnerHealth.layerRpc,
      layerSocketServer,
      ShardManager.layerConfigFromEnv(options?.config)
    ]),
    Layer.provide(layerClientProtocol),
    Layer.provide(options?.storage === "sql" ? SqlShardStorage.layer : ShardStorage.layerNoop),
    Layer.provide([
      options?.serialization === "ndjson" ? RpcSerialization.layerNdjson : RpcSerialization.layerMsgPack,
      ShardingConfig.layerFromEnv(options?.shardingConfig)
    ])
  ) as any
