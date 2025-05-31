/**
 * @since 1.0.0
 */
import * as MessageStorage from "@effect/cluster/MessageStorage"
import type * as Runners from "@effect/cluster/Runners"
import type { Sharding } from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardStorage from "@effect/cluster/ShardStorage"
import * as SocketRunner from "@effect/cluster/SocketRunner"
import * as SqlMessageStorage from "@effect/cluster/SqlMessageStorage"
import * as SqlShardStorage from "@effect/cluster/SqlShardStorage"
import type * as SocketServer from "@effect/platform/SocketServer"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import type { SqlClient } from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { ConfigError } from "effect/ConfigError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
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
  if (Option.isNone(config.runnerAddress)) {
    return yield* Effect.dieMessage("layerSocketServer: ShardingConfig.runnerAddress is None")
  }
  return NodeSocketServer.layer(config.runnerAddress.value)
}).pipe(Layer.unwrapEffect)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = <const ClientOnly extends boolean = false, const Storage extends "noop" | "sql" = "noop">(
  options?: {
    readonly serialization?: "msgpack" | "ndjson" | undefined
    readonly clientOnly?: ClientOnly | undefined
    readonly storage?: Storage | undefined
    readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig["Type"]> | undefined
  }
): ClientOnly extends true ? Layer.Layer<
    Sharding | Runners.Runners,
    ConfigError,
    Storage extends "sql" ? SqlClient : never
  > :
  Layer.Layer<
    Sharding | Runners.Runners | MessageStorage.MessageStorage,
    SocketServer.SocketServerError | ConfigError | (Storage extends "sql" ? SqlError : never),
    Storage extends "sql" ? SqlClient : never
  > =>
{
  const layer: Layer.Layer<any, any, any> = options?.clientOnly
    // client only
    ? Layer.provide(SocketRunner.layerClientOnly, layerClientProtocol)
    // with server
    : Layer.provide(SocketRunner.layer, [layerSocketServer, layerClientProtocol])

  return layer.pipe(
    Layer.provideMerge(
      options?.storage === "sql"
        ? SqlMessageStorage.layer
        : MessageStorage.layerNoop
    ),
    Layer.provide(
      options?.storage === "sql"
        ? options.clientOnly ? Layer.empty : SqlShardStorage.layer
        : ShardStorage.layerNoop
    ),
    Layer.provide(ShardingConfig.layerFromEnv(options?.shardingConfig)),
    Layer.provide(
      options?.serialization === "ndjson" ? RpcSerialization.layerNdjson : RpcSerialization.layerMsgPack
    )
  ) as any
}
