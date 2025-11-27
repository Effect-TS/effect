/**
 * @since 1.0.0
 */
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Context from "effect/Context"
import type { DurationInput } from "effect/Duration"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { RunnerAddress } from "./RunnerAddress.js"

/**
 * Represents the configuration for the `Sharding` service on a given runner.
 *
 * @since 1.0.0
 * @category models
 */
export class ShardingConfig extends Context.Tag("@effect/cluster/ShardingConfig")<ShardingConfig, {
  /**
   * The address for the current runner that other runners can use to
   * communicate with it.
   *
   * If `None`, the runner is not part of the cluster and will be in a client-only
   * mode.
   */
  readonly runnerAddress: Option.Option<RunnerAddress>
  /**
   * The listen address for the current runner.
   *
   * Defaults to the `runnerAddress`.
   */
  readonly runnerListenAddress: Option.Option<RunnerAddress>
  /**
   * A number that determines how many shards this runner will be assigned
   * relative to other runners.
   *
   * Defaults to `1`.
   *
   * A value of `2` means that this runner should be assigned twice as many
   * shards as a runner with a weight of `1`.
   */
  readonly runnerShardWeight: number
  /**
   * The shard groups that are assigned to this runner.
   *
   * Defaults to `["default"]`.
   */
  readonly shardGroups: ReadonlyArray<string>
  /**
   * The number of shards to allocate per shard group.
   *
   * **Note**: this value should be consistent across all runners.
   */
  readonly shardsPerGroup: number
  /**
   * Shard lock refresh interval.
   */
  readonly shardLockRefreshInterval: DurationInput
  /**
   * Shard lock expiration duration.
   */
  readonly shardLockExpiration: DurationInput
  /**
   * Disable the use of advisory locks for shard locking.
   */
  readonly shardLockDisableAdvisory: boolean
  /**
   * Start shutting down as soon as an Entity has started shutting down.
   *
   * Defaults to `true`.
   */
  readonly preemptiveShutdown: boolean
  /**
   * The default capacity of the mailbox for entities.
   */
  readonly entityMailboxCapacity: number | "unbounded"
  /**
   * The maximum duration of inactivity (i.e. without receiving a message)
   * after which an entity will be interrupted.
   */
  readonly entityMaxIdleTime: DurationInput
  /**
   * If an entity does not register itself within this time after a message is
   * sent to it, the message will be marked as failed.
   *
   * Defaults to 1 minute.
   */
  readonly entityRegistrationTimeout: DurationInput
  /**
   * The maximum duration of time to wait for an entity to terminate.
   *
   * By default this is set to 15 seconds to stay within kubernetes defaults.
   */
  readonly entityTerminationTimeout: DurationInput
  /**
   * The interval at which to poll for unprocessed messages from storage.
   */
  readonly entityMessagePollInterval: DurationInput
  /**
   * The interval at which to poll for client replies from storage.
   */
  readonly entityReplyPollInterval: DurationInput
  /**
   * The interval at which to poll for new runners and refresh shard
   * assignments.
   */
  readonly refreshAssignmentsInterval: DurationInput
  /**
   * The interval to retry a send if EntityNotAssignedToRunner is returned.
   */
  readonly sendRetryInterval: DurationInput
  /**
   * The interval at which to check for unhealthy runners and report them
   */
  readonly runnerHealthCheckInterval: DurationInput
  /**
   * Simulate serialization and deserialization to remote runners for local
   * entities.
   */
  readonly simulateRemoteSerialization: boolean
}>() {}

const defaultRunnerAddress = RunnerAddress.make({ host: "localhost", port: 34431 })

/**
 * @since 1.0.0
 * @category defaults
 */
export const defaults: ShardingConfig["Type"] = {
  runnerAddress: Option.some(defaultRunnerAddress),
  runnerListenAddress: Option.none(),
  runnerShardWeight: 1,
  shardsPerGroup: 300,
  shardGroups: ["default"],
  preemptiveShutdown: true,
  shardLockRefreshInterval: Duration.seconds(10),
  shardLockExpiration: Duration.seconds(35),
  shardLockDisableAdvisory: false,
  entityMailboxCapacity: 4096,
  entityMaxIdleTime: Duration.minutes(1),
  entityRegistrationTimeout: Duration.minutes(1),
  entityTerminationTimeout: Duration.seconds(15),
  entityMessagePollInterval: Duration.seconds(10),
  entityReplyPollInterval: Duration.millis(200),
  sendRetryInterval: Duration.millis(100),
  refreshAssignmentsInterval: Duration.seconds(3),
  runnerHealthCheckInterval: Duration.minutes(1),
  simulateRemoteSerialization: true
}

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options?: Partial<ShardingConfig["Type"]>): Layer.Layer<ShardingConfig> =>
  Layer.succeed(ShardingConfig, { ...defaults, ...options })

/**
 * @since 1.0.0
 * @category defaults
 */
export const layerDefaults: Layer.Layer<ShardingConfig> = layer()

/**
 * @since 1.0.0
 * @category Config
 */
export const config: Config.Config<ShardingConfig["Type"]> = Config.all({
  runnerAddress: Config.all({
    host: Config.string("host").pipe(
      Config.withDefault(defaultRunnerAddress.host),
      Config.withDescription("The hostname or IP address of the runner.")
    ),
    port: Config.integer("port").pipe(
      Config.withDefault(defaultRunnerAddress.port),
      Config.withDescription("The port used for inter-runner communication.")
    )
  }).pipe(Config.map((options) => RunnerAddress.make(options)), Config.option),
  runnerListenAddress: Config.all({
    host: Config.string("listenHost").pipe(
      Config.withDescription("The host to listen on.")
    ),
    port: Config.integer("listenPort").pipe(
      Config.withDefault(defaultRunnerAddress.port),
      Config.withDescription("The port to listen on.")
    )
  }).pipe(Config.map((options) => RunnerAddress.make(options)), Config.option),
  runnerShardWeight: Config.integer("runnerShardWeight").pipe(
    Config.withDefault(defaults.runnerShardWeight)
  ),
  shardGroups: Config.array(Config.string("shardGroups")).pipe(
    Config.withDefault(["default"]),
    Config.withDescription("The shard groups that are assigned to this runner.")
  ),
  shardsPerGroup: Config.integer("shardsPerGroup").pipe(
    Config.withDefault(defaults.shardsPerGroup),
    Config.withDescription("The number of shards to allocate per shard group.")
  ),
  preemptiveShutdown: Config.boolean("preemptiveShutdown").pipe(
    Config.withDefault(defaults.preemptiveShutdown),
    Config.withDescription("Start shutting down as soon as an Entity has started shutting down.")
  ),
  shardLockRefreshInterval: Config.duration("shardLockRefreshInterval").pipe(
    Config.withDefault(defaults.shardLockRefreshInterval),
    Config.withDescription("Shard lock refresh interval.")
  ),
  shardLockExpiration: Config.duration("shardLockExpiration").pipe(
    Config.withDefault(defaults.shardLockExpiration),
    Config.withDescription("Shard lock expiration duration.")
  ),
  shardLockDisableAdvisory: Config.boolean("shardLockDisableAdvisory").pipe(
    Config.withDefault(defaults.shardLockDisableAdvisory),
    Config.withDescription("Disable the use of advisory locks for shard locking.")
  ),
  entityMailboxCapacity: Config.integer("entityMailboxCapacity").pipe(
    Config.withDefault(defaults.entityMailboxCapacity),
    Config.withDescription("The default capacity of the mailbox for entities.")
  ),
  entityMaxIdleTime: Config.duration("entityMaxIdleTime").pipe(
    Config.withDefault(defaults.entityMaxIdleTime),
    Config.withDescription(
      "The maximum duration of inactivity (i.e. without receiving a message) after which an entity will be interrupted."
    )
  ),
  entityRegistrationTimeout: Config.duration("entityRegistrationTimeout").pipe(
    Config.withDefault(defaults.entityRegistrationTimeout),
    Config.withDescription(
      "If an entity does not register itself within this time after a message is sent to it, the message will be marked as failed."
    )
  ),
  entityTerminationTimeout: Config.duration("entityTerminationTimeout").pipe(
    Config.withDefault(defaults.entityTerminationTimeout),
    Config.withDescription("The maximum duration of time to wait for an entity to terminate.")
  ),
  entityMessagePollInterval: Config.duration("entityMessagePollInterval").pipe(
    Config.withDefault(defaults.entityMessagePollInterval),
    Config.withDescription("The interval at which to poll for unprocessed messages from storage.")
  ),
  entityReplyPollInterval: Config.duration("entityReplyPollInterval").pipe(
    Config.withDefault(defaults.entityReplyPollInterval),
    Config.withDescription("The interval at which to poll for client replies from storage.")
  ),
  sendRetryInterval: Config.duration("sendRetryInterval").pipe(
    Config.withDefault(defaults.sendRetryInterval),
    Config.withDescription("The interval to retry a send if EntityNotAssignedToRunner is returned.")
  ),
  refreshAssignmentsInterval: Config.duration("refreshAssignmentsInterval").pipe(
    Config.withDefault(defaults.refreshAssignmentsInterval),
    Config.withDescription("The interval at which to refresh shard assignments.")
  ),
  runnerHealthCheckInterval: Config.duration("runnerHealthCheckInterval").pipe(
    Config.withDefault(defaults.runnerHealthCheckInterval),
    Config.withDescription("The interval at which to check for unhealthy runners and report them.")
  ),
  simulateRemoteSerialization: Config.boolean("simulateRemoteSerialization").pipe(
    Config.withDefault(defaults.simulateRemoteSerialization),
    Config.withDescription("Simulate serialization and deserialization to remote runners for local entities.")
  )
})

/**
 * @since 1.0.0
 * @category Config
 */
export const configFromEnv = config.pipe(
  Effect.withConfigProvider(
    ConfigProvider.fromEnv().pipe(
      ConfigProvider.constantCase
    )
  )
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerFromEnv = (options?: Partial<ShardingConfig["Type"]> | undefined): Layer.Layer<
  ShardingConfig,
  ConfigError
> =>
  Layer.effect(
    ShardingConfig,
    options ? Effect.map(configFromEnv, (config) => ({ ...config, ...options })) : configFromEnv
  )
