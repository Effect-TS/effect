import * as Config from "effect/Config"
import type * as ConfigError from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as ShardingConfig from "../ShardingConfig.js"

/** @internal */
const ShardingConfigSymbolKey = "@effect/cluster/ShardingConfig"

/** @internal */
export const ShardingConfigTypeId: ShardingConfig.ShardingConfigTypeId = Symbol.for(
  ShardingConfigSymbolKey
) as ShardingConfig.ShardingConfigTypeId

/** @internal */
export const shardingConfigTag = Context.GenericTag<ShardingConfig.ShardingConfig>(ShardingConfigSymbolKey)

/** @internal */
const defaultValues: ShardingConfig.ShardingConfig = {
  numberOfShards: 300,
  selfHost: "localhost",
  shardingPort: 54321,
  shardManagerUri: "http://localhost:8080/api/rest",
  serverVersion: "1.0.0",
  entityMaxIdleTime: Duration.minutes(1),
  entityTerminationTimeout: Duration.seconds(3),
  refreshAssignmentsRetryInterval: Duration.seconds(5),
  unhealthyPodReportInterval: Duration.seconds(5)
}

/** @internal */
export const defaults = Layer.succeed(shardingConfigTag, defaultValues)

/** @internal */
export function withDefaults(customs: Partial<ShardingConfig.ShardingConfig>) {
  return Layer.succeed(shardingConfigTag, {
    ...defaultValues,
    ...customs
  })
}

/** @internal */
const config: Config.Config<ShardingConfig.ShardingConfig> = Config.all({
  numberOfShards: pipe(
    Config.number("NUMBER_OF_SHARDS"),
    Config.withDefault(defaultValues.numberOfShards),
    Config.withDescription("Number of shards")
  ),
  selfHost: pipe(
    Config.string("SELF_HOST"),
    Config.withDefault(defaultValues.selfHost),
    Config.withDescription("Fully qualified name of the current host address")
  ),
  shardingPort: pipe(
    Config.integer("PORT"),
    Config.withDefault(defaultValues.shardingPort),
    Config.withDescription("Port of the Pod API service")
  ),
  shardManagerUri: pipe(
    Config.string("SHARD_MANAGER_URI"),
    Config.withDefault(defaultValues.shardManagerUri),
    Config.withDescription("API address of the Shard Manager URI")
  ),
  serverVersion: pipe(
    Config.string("SERVER_VERSION"),
    Config.withDefault(defaultValues.serverVersion),
    Config.withDescription("Server version")
  ),
  entityMaxIdleTime: pipe(
    Config.map(Config.integer("ENTITY_MAX_IDLE_TIME"), Duration.millis),
    Config.withDefault(defaultValues.entityMaxIdleTime),
    Config.withDescription("Max entity idle time (millis)")
  ),
  entityTerminationTimeout: pipe(
    Config.map(Config.integer("ENTITY_TERMINATION_TIMEOUT"), Duration.millis),
    Config.withDefault(defaultValues.entityTerminationTimeout),
    Config.withDescription("Max time to wait for entity to terminate (millis)")
  ),
  refreshAssignmentsRetryInterval: pipe(
    Config.map(Config.integer("REFRESH_ASSIGNMENTS_INTERVAL"), Duration.millis),
    Config.withDefault(defaultValues.refreshAssignmentsRetryInterval),
    Config.withDescription("Interval on which retry getting assignments (millis)")
  ),
  unhealthyPodReportInterval: pipe(
    Config.map(Config.integer("UNHEALTHY_POD_REPORT_INTERVAL"), Duration.millis),
    Config.withDefault(defaultValues.unhealthyPodReportInterval),
    Config.withDescription("Interval on which report unhealthy pods (millis)")
  )
})

/** @internal */
export const fromConfig: Layer.Layer<ShardingConfig.ShardingConfig, ConfigError.ConfigError> = Layer.effect(
  shardingConfigTag,
  config
)
