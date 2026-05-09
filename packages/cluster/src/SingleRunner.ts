/**
 * @since 1.0.0
 */
import type * as SqlClient from "@effect/sql/SqlClient"
import type * as ConfigError from "effect/ConfigError"
import * as Layer from "effect/Layer"
import type * as MessageStorage from "./MessageStorage.js"
import * as RunnerHealth from "./RunnerHealth.js"
import * as Runners from "./Runners.js"
import * as RunnerStorage from "./RunnerStorage.js"
import * as Sharding from "./Sharding.js"
import * as ShardingConfig from "./ShardingConfig.js"
import * as SqlMessageStorage from "./SqlMessageStorage.js"
import * as SqlRunnerStorage from "./SqlRunnerStorage.js"

/**
 * A sql backed single-node cluster, that can be used for running durable
 * entities and workflows.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options?: {
  readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig["Type"]> | undefined
  readonly runnerStorage?: "memory" | "sql" | undefined
}): Layer.Layer<
  | Sharding.Sharding
  | Runners.Runners
  | MessageStorage.MessageStorage,
  ConfigError.ConfigError,
  SqlClient.SqlClient
> =>
  Sharding.layer.pipe(
    Layer.provideMerge(Runners.layerNoop),
    Layer.provideMerge(SqlMessageStorage.layer),
    Layer.provide([
      options?.runnerStorage === "memory" ? RunnerStorage.layerMemory : Layer.orDie(SqlRunnerStorage.layer),
      RunnerHealth.layerNoop
    ]),
    Layer.provide(ShardingConfig.layerFromEnv(options?.shardingConfig))
  )
