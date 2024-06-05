import * as Config from "effect/Config"
import type * as ConfigError from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as ManagerConfig from "../ManagerConfig.js"

/** @internal */
const ManagerConfigSymbolKey = "@effect/cluster/ManagerConfig"

/** @internal */
export const ManagerConfigTypeId: ManagerConfig.ManagerConfigTypeId = Symbol.for(
  ManagerConfigSymbolKey
) as ManagerConfig.ManagerConfigTypeId

/** @internal */
export const managerConfigTag: Context.Tag<ManagerConfig.ManagerConfig, ManagerConfig.ManagerConfig> = Context
  .GenericTag(ManagerConfigSymbolKey)

/** @internal */
const defaultValues: ManagerConfig.ManagerConfig = {
  numberOfShards: 300,
  apiPort: 8080,
  rebalanceInterval: Duration.seconds(20),
  rebalanceRetryInterval: Duration.seconds(10),
  pingTimeout: Duration.seconds(3),
  persistRetryInterval: Duration.seconds(3),
  persistRetryCount: 100,
  rebalanceRate: 2 / 100
}

/** @internal */
export const defaults: Layer.Layer<ManagerConfig.ManagerConfig> = Layer.succeed(managerConfigTag, defaultValues)

/** @internal */
const config: Config.Config<ManagerConfig.ManagerConfig> = Config.all({
  numberOfShards: pipe(
    Config.number("NUMBER_OF_SHARDS"),
    Config.withDefault(defaultValues.numberOfShards),
    Config.withDescription("Number of shards")
  ),
  apiPort: pipe(
    Config.integer("API_PORT"),
    Config.withDefault(defaultValues.apiPort),
    Config.withDescription("API port")
  ),
  rebalanceInterval: pipe(
    Config.map(Config.number("REBALANCE_INTERVAL"), Duration.millis),
    Config.withDefault(defaultValues.rebalanceInterval),
    Config.withDescription("Interval of rebalance")
  ),
  rebalanceRetryInterval: pipe(
    Config.map(Config.number("REBALANCE_RETRY_INTERVAL"), Duration.millis),
    Config.withDefault(defaultValues.rebalanceRetryInterval),
    Config.withDescription("Retry interval of rebalance")
  ),
  pingTimeout: pipe(
    Config.map(Config.number("PING_TIMEOUT"), Duration.millis),
    Config.withDefault(defaultValues.pingTimeout),
    Config.withDescription("Ping timeout")
  ),
  persistRetryInterval: pipe(
    Config.map(Config.number("PERSIST_RETRY_INTERVAL"), Duration.millis),
    Config.withDefault(defaultValues.persistRetryInterval),
    Config.withDescription("Persist retry interval")
  ),
  persistRetryCount: pipe(
    Config.number("PERSIST_RETRY_COUNT"),
    Config.withDefault(defaultValues.persistRetryCount),
    Config.withDescription("Persist retry count")
  ),
  rebalanceRate: pipe(
    Config.number("REBALANCE_RATE"),
    Config.withDefault(defaultValues.rebalanceRate),
    Config.withDescription("Rebalance rate")
  )
})

/** @internal */
export const fromConfig: Layer.Layer<ManagerConfig.ManagerConfig, ConfigError.ConfigError> = Layer.effect(
  managerConfigTag,
  config
)
