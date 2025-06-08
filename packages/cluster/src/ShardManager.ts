/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Config_ from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as FiberSet from "effect/FiberSet"
import { identity } from "effect/Function"
import * as Iterable from "effect/Iterable"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Metric from "effect/Metric"
import * as MetricLabel from "effect/MetricLabel"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableHashSet from "effect/MutableHashSet"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import { RunnerNotRegistered } from "./ClusterError.js"
import * as ClusterMetrics from "./ClusterMetrics.js"
import {
  addAllNested,
  decideAssignmentsForUnassignedShards,
  decideAssignmentsForUnbalancedShards,
  State
} from "./internal/shardManager.js"
import * as MachineId from "./MachineId.js"
import { Runner } from "./Runner.js"
import { RunnerAddress } from "./RunnerAddress.js"
import { RunnerHealth } from "./RunnerHealth.js"
import { RpcClientProtocol, Runners } from "./Runners.js"
import { make as makeShardId, ShardId } from "./ShardId.js"
import { ShardingConfig } from "./ShardingConfig.js"
import { ShardStorage } from "./ShardStorage.js"

/**
 * @since 1.0.0
 * @category models
 */
export class ShardManager extends Context.Tag("@effect/cluster/ShardManager")<ShardManager, {
  /**
   * Get all shard assignments.
   */
  readonly getAssignments: Effect.Effect<
    Iterable<readonly [ShardId, Option.Option<RunnerAddress>]>
  >
  /**
   * Get a stream of sharding events emit by the shard manager.
   */
  readonly shardingEvents: Effect.Effect<Queue.Dequeue<ShardingEvent>, never, Scope>
  /**
   * Register a new runner with the cluster.
   */
  readonly register: (runner: Runner) => Effect.Effect<MachineId.MachineId>
  /**
   * Unregister a runner from the cluster.
   */
  readonly unregister: (address: RunnerAddress) => Effect.Effect<void>
  /**
   * Rebalance shards assigned to runners within the cluster.
   */
  readonly rebalance: (immediate: boolean) => Effect.Effect<void>
  /**
   * Notify the cluster of an unhealthy runner.
   */
  readonly notifyUnhealthyRunner: (address: RunnerAddress) => Effect.Effect<void>
  /**
   * Check and repot on the health of all runners in the cluster.
   */
  readonly checkRunnerHealth: Effect.Effect<void>
}>() {}

/**
 * @since 1.0.0
 * @category Config
 */
export class Config extends Context.Tag("@effect/cluster/ShardManager/Config")<Config, {
  /**
   * The duration to wait before rebalancing shards after a change.
   */
  readonly rebalanceDebounce: Duration.DurationInput
  /**
   * The interval on which regular rebalancing of shards will occur.
   */
  readonly rebalanceInterval: Duration.DurationInput
  /**
   * The interval on which rebalancing of shards which failed to be
   * rebalanced will be retried.
   */
  readonly rebalanceRetryInterval: Duration.DurationInput
  /**
   * The maximum ratio of shards to rebalance at once.
   *
   * **Note**: this value should be a number between `0` and `1`.
   */
  readonly rebalanceRate: number
  /**
   * The interval on which persistence of Runners will be retried if it fails.
   */
  readonly persistRetryInterval: Duration.DurationInput
  /**
   * The number of times persistence of Runners will be retried if it fails.
   */
  readonly persistRetryCount: number
  /**
   * The interval on which Runner health will be checked.
   */
  readonly runnerHealthCheckInterval: Duration.DurationInput
  /**
   * The length of time to wait for a Runner to respond to a ping.
   */
  readonly runnerPingTimeout: Duration.DurationInput
}>() {
  /**
   * @since 1.0.0
   */
  static readonly defaults: Config["Type"] = {
    rebalanceDebounce: Duration.millis(500),
    rebalanceInterval: Duration.seconds(20),
    rebalanceRetryInterval: Duration.seconds(10),
    rebalanceRate: 2 / 100,
    persistRetryCount: 100,
    persistRetryInterval: Duration.seconds(3),
    runnerHealthCheckInterval: Duration.minutes(1),
    runnerPingTimeout: Duration.seconds(3)
  }
}

/**
 * @since 1.0.0
 * @category Config
 */
export const configConfig: Config_.Config<Config["Type"]> = Config_.all({
  rebalanceDebounce: Config_.duration("rebalanceDebounce").pipe(
    Config_.withDefault(Config.defaults.rebalanceDebounce),
    Config_.withDescription("The duration to wait before rebalancing shards after a change.")
  ),
  rebalanceInterval: Config_.duration("rebalanceInterval").pipe(
    Config_.withDefault(Config.defaults.rebalanceInterval),
    Config_.withDescription("The interval on which regular rebalancing of shards will occur.")
  ),
  rebalanceRetryInterval: Config_.duration("rebalanceRetryInterval").pipe(
    Config_.withDefault(Config.defaults.rebalanceRetryInterval),
    Config_.withDescription(
      "The interval on which rebalancing of shards which failed to be rebalanced will be retried."
    )
  ),
  rebalanceRate: Config_.number("rebalanceRate").pipe(
    Config_.withDefault(Config.defaults.rebalanceRate),
    Config_.withDescription("The maximum ratio of shards to rebalance at once.")
  ),
  persistRetryCount: Config_.integer("persistRetryCount").pipe(
    Config_.withDefault(Config.defaults.persistRetryCount),
    Config_.withDescription("The number of times persistence of runners will be retried if it fails.")
  ),
  persistRetryInterval: Config_.duration("persistRetryInterval").pipe(
    Config_.withDefault(Config.defaults.persistRetryInterval),
    Config_.withDescription("The interval on which persistence of runners will be retried if it fails.")
  ),
  runnerHealthCheckInterval: Config_.duration("runnerHealthCheckInterval").pipe(
    Config_.withDefault(Config.defaults.runnerHealthCheckInterval),
    Config_.withDescription("The interval on which runner health will be checked.")
  ),
  runnerPingTimeout: Config_.duration("runnerPingTimeout").pipe(
    Config_.withDefault(Config.defaults.runnerPingTimeout),
    Config_.withDescription("The length of time to wait for a runner to respond to a ping.")
  )
})

/**
 * @since 1.0.0
 * @category Config
 */
export const configFromEnv: Effect.Effect<Config["Type"], ConfigError> = configConfig.pipe(
  Effect.withConfigProvider(
    ConfigProvider.fromEnv().pipe(
      ConfigProvider.constantCase
    )
  )
)

/**
 * @since 1.0.0
 * @category Config
 */
export const layerConfig = (config?: Partial<Config["Type"]> | undefined): Layer.Layer<Config> =>
  Layer.succeed(Config, {
    ...Config.defaults,
    ...config
  })

/**
 * @since 1.0.0
 * @category Config
 */
export const layerConfigFromEnv = (config?: Partial<Config["Type"]> | undefined): Layer.Layer<Config, ConfigError> =>
  Layer.effect(Config, config ? Effect.map(configFromEnv, (env) => ({ ...env, ...config })) : configFromEnv)

/**
 * Represents a client which can be used to communicate with the
 * `ShardManager`.
 *
 * @since 1.0.0
 * @category Client
 */
export class ShardManagerClient
  extends Context.Tag("@effect/cluster/ShardManager/ShardManagerClient")<ShardManagerClient, {
    /**
     * Register a new runner with the cluster.
     */
    readonly register: (address: RunnerAddress, groups: ReadonlyArray<string>) => Effect.Effect<MachineId.MachineId>
    /**
     * Unregister a runner from the cluster.
     */
    readonly unregister: (address: RunnerAddress) => Effect.Effect<void>
    /**
     * Notify the cluster of an unhealthy runner.
     */
    readonly notifyUnhealthyRunner: (address: RunnerAddress) => Effect.Effect<void>
    /**
     * Get all shard assignments.
     */
    readonly getAssignments: Effect.Effect<
      Iterable<readonly [ShardId, Option.Option<RunnerAddress>]>
    >
    /**
     * Get a stream of sharding events emit by the shard manager.
     */
    readonly shardingEvents: Effect.Effect<Mailbox.ReadonlyMailbox<ShardingEvent>, never, Scope>
    /**
     * Get the current time on the shard manager.
     */
    readonly getTime: Effect.Effect<number>
  }>()
{}

/**
 * @since 1.0.0
 * @category models
 */
export const ShardingEventSchema = Schema.Union(
  Schema.TaggedStruct("StreamStarted", {}),
  Schema.TaggedStruct("ShardsAssigned", {
    address: RunnerAddress,
    shards: Schema.Array(ShardId)
  }),
  Schema.TaggedStruct("ShardsUnassigned", {
    address: RunnerAddress,
    shards: Schema.Array(ShardId)
  }),
  Schema.TaggedStruct("RunnerRegistered", {
    address: RunnerAddress
  }),
  Schema.TaggedStruct("RunnerUnregistered", {
    address: RunnerAddress
  })
) satisfies Schema.Schema<ShardingEvent, any>

/**
 * The messaging protocol for the `ShardManager`.
 *
 * @since 1.0.0
 * @category Rpcs
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make("Register", {
    payload: { runner: Runner },
    success: MachineId.MachineId
  }),
  Rpc.make("Unregister", {
    payload: { address: RunnerAddress }
  }),
  Rpc.make("NotifyUnhealthyRunner", {
    payload: { address: RunnerAddress }
  }),
  Rpc.make("GetAssignments", {
    success: Schema.Array(Schema.Tuple(ShardId, Schema.Option(RunnerAddress)))
  }),
  Rpc.make("ShardingEvents", {
    success: ShardingEventSchema,
    stream: true
  }),
  Rpc.make("GetTime", {
    success: Schema.Number
  })
) {}

/**
 * @since 1.0.0
 * @category models
 */
export type ShardingEvent = Data.TaggedEnum<{
  StreamStarted: {}
  ShardsAssigned: {
    address: RunnerAddress
    shards: ReadonlyArray<ShardId>
  }
  ShardsUnassigned: {
    address: RunnerAddress
    shards: ReadonlyArray<ShardId>
  }
  RunnerRegistered: { address: RunnerAddress }
  RunnerUnregistered: { address: RunnerAddress }
}>

/**
 * @since 1.0.0
 * @category models
 */
export const ShardingEvent = Data.taggedEnum<ShardingEvent>()

/**
 * @since 1.0.0
 * @category Client
 */
export const makeClientLocal = Effect.gen(function*() {
  const config = yield* ShardingConfig
  const clock = yield* Effect.clock

  const groups = new Set<string>()
  const shards = MutableHashMap.empty<ShardId, Option.Option<RunnerAddress>>()

  let machineId = 0

  return ShardManagerClient.of({
    register: (_, groupsToAdd) =>
      Effect.sync(() => {
        for (const group of groupsToAdd) {
          if (groups.has(group)) continue
          groups.add(group)
          for (let n = 1; n <= config.shardsPerGroup; n++) {
            MutableHashMap.set(shards, makeShardId(group, n), config.runnerAddress)
          }
        }
        return MachineId.make(++machineId)
      }),
    unregister: () => Effect.void,
    notifyUnhealthyRunner: () => Effect.void,
    getAssignments: Effect.succeed(shards),
    shardingEvents: Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<ShardingEvent>()
      yield* mailbox.offer(ShardingEvent.StreamStarted())
      return mailbox
    }),
    getTime: clock.currentTimeMillis
  })
})

/**
 * @since 1.0.0
 * @category Client
 */
export const makeClientRpc: Effect.Effect<
  ShardManagerClient["Type"],
  never,
  ShardingConfig | RpcClient.Protocol | Scope
> = Effect.gen(function*() {
  const config = yield* ShardingConfig
  const client = yield* RpcClient.make(Rpcs, {
    spanPrefix: "ShardManagerClient",
    disableTracing: true
  })

  return ShardManagerClient.of({
    register: (address, groups) =>
      client.Register({ runner: Runner.make({ address, version: config.serverVersion, groups }) }),
    unregister: (address) => client.Unregister({ address }),
    notifyUnhealthyRunner: (address) => client.NotifyUnhealthyRunner({ address }),
    getAssignments: client.GetAssignments(),
    shardingEvents: client.ShardingEvents({}, { asMailbox: true }),
    getTime: client.GetTime()
  })
})

/**
 * @since 1.0.0
 * @category Client
 */
export const layerClientLocal: Layer.Layer<
  ShardManagerClient,
  never,
  ShardingConfig
> = Layer.effect(ShardManagerClient, makeClientLocal)

/**
 * @since 1.0.0
 * @category Client
 */
export const layerClientRpc: Layer.Layer<
  ShardManagerClient,
  never,
  ShardingConfig | RpcClientProtocol
> = Layer.scoped(ShardManagerClient, makeClientRpc).pipe(
  Layer.provide(Layer.scoped(
    RpcClient.Protocol,
    Effect.gen(function*() {
      const config = yield* ShardingConfig
      const clientProtocol = yield* RpcClientProtocol
      return yield* clientProtocol(config.shardManagerAddress)
    })
  ))
)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.gen(function*() {
  const storage = yield* ShardStorage
  const runnersApi = yield* Runners
  const runnerHealthApi = yield* RunnerHealth
  const clock = yield* Effect.clock
  const config = yield* Config
  const shardingConfig = yield* ShardingConfig

  const state = yield* Effect.orDie(State.fromStorage(shardingConfig.shardsPerGroup))
  const scope = yield* Effect.scope
  const events = yield* PubSub.unbounded<ShardingEvent>()

  function updateRunnerMetrics() {
    ClusterMetrics.runners.unsafeUpdate(MutableHashMap.size(state.allRunners), [])
  }

  function updateShardMetrics() {
    const stats = state.shardStats
    for (const [address, shardCount] of stats.perRunner) {
      ClusterMetrics.assignedShards.unsafeUpdate(
        shardCount,
        [MetricLabel.make("address", address)]
      )
    }
    ClusterMetrics.unassignedShards.unsafeUpdate(stats.unassigned, [])
  }
  updateShardMetrics()

  function withRetry<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<void, never, R> {
    return effect.pipe(
      Effect.retry({
        schedule: Schedule.spaced(config.persistRetryCount),
        times: config.persistRetryCount
      }),
      Effect.ignore
    )
  }

  const persistRunners = Effect.unsafeMakeSemaphore(1).withPermits(1)(withRetry(
    Effect.suspend(() =>
      storage.saveRunners(
        Iterable.map(state.allRunners, ([address, runner]) => [address, runner.runner])
      )
    )
  ))

  const persistAssignments = Effect.unsafeMakeSemaphore(1).withPermits(1)(withRetry(
    Effect.suspend(() => storage.saveAssignments(state.assignments))
  ))

  const notifyUnhealthyRunner = Effect.fnUntraced(function*(address: RunnerAddress) {
    if (!MutableHashMap.has(state.allRunners, address)) return

    yield* Metric.increment(
      Metric.tagged(ClusterMetrics.runnerHealthChecked, "runner_address", address.toString())
    )

    if (!(yield* runnerHealthApi.isAlive(address))) {
      yield* Effect.logWarning(`Runner at address '${address.toString()}' is not alive`)
      yield* unregister(address)
    }
  })

  function updateShardsState(
    shards: Iterable<ShardId>,
    address: Option.Option<RunnerAddress>
  ): Effect.Effect<void, RunnerNotRegistered> {
    return Effect.suspend(() => {
      if (Option.isSome(address) && !MutableHashMap.has(state.allRunners, address.value)) {
        return Effect.fail(new RunnerNotRegistered({ address: address.value }))
      }
      state.addAssignments(shards, address)
      return Effect.void
    })
  }

  const getAssignments = Effect.sync(() => state.assignments)

  let machineId = 0
  const register = Effect.fnUntraced(function*(runner: Runner) {
    yield* Effect.logInfo(`Registering runner ${Runner.pretty(runner)}`)

    state.addRunner(runner, clock.unsafeCurrentTimeMillis())
    updateRunnerMetrics()
    yield* PubSub.publish(events, ShardingEvent.RunnerRegistered({ address: runner.address }))

    if (state.allUnassignedShards.length > 0) {
      yield* rebalance(false)
    }
    yield* Effect.forkIn(persistRunners, scope)
    return MachineId.make(++machineId)
  })

  const unregister = Effect.fnUntraced(function*(address: RunnerAddress) {
    if (!MutableHashMap.has(state.allRunners, address)) return

    yield* Effect.logInfo("Unregistering runner at address:", address)
    const unassignments = Arr.empty<ShardId>()
    for (const [shard, runner] of state.assignments) {
      if (Option.isSome(runner) && Equal.equals(runner.value, address)) {
        unassignments.push(shard)
      }
    }
    state.addAssignments(unassignments, Option.none())
    state.removeRunner(address)
    updateRunnerMetrics()

    if (unassignments.length > 0) {
      yield* PubSub.publish(events, ShardingEvent.RunnerUnregistered({ address }))
    }

    yield* Effect.forkIn(persistRunners, scope)
    yield* Effect.forkIn(rebalance(true), scope)
  })

  let rebalancing = false
  let nextRebalanceImmediate = false
  let rebalanceDeferred: Deferred.Deferred<void> | undefined
  const rebalanceFibers = yield* FiberSet.make()

  const rebalance = (immmediate: boolean): Effect.Effect<void> =>
    Effect.withFiberRuntime<void>((fiber) => {
      if (!rebalancing) {
        rebalancing = true
        return rebalanceLoop(immmediate)
      }
      if (immmediate) {
        nextRebalanceImmediate = true
      }
      if (!rebalanceDeferred) {
        rebalanceDeferred = Deferred.unsafeMake(fiber.id())
      }
      return Deferred.await(rebalanceDeferred)
    })

  const rebalanceLoop = (immediate?: boolean): Effect.Effect<void> =>
    Effect.suspend(() => {
      const deferred = rebalanceDeferred
      rebalanceDeferred = undefined
      if (!immediate) {
        immediate = nextRebalanceImmediate
        nextRebalanceImmediate = false
      }
      return runRebalance(immediate).pipe(
        deferred ? Effect.intoDeferred(deferred) : identity,
        Effect.onExit(() => {
          if (!rebalanceDeferred) {
            rebalancing = false
            return Effect.void
          }
          return Effect.forkIn(rebalanceLoop(), scope)
        })
      )
    })

  const runRebalance = Effect.fn("ShardManager.rebalance")(function*(immediate: boolean) {
    yield* Effect.annotateCurrentSpan("immmediate", immediate)

    yield* Effect.sleep(config.rebalanceDebounce)

    if (state.shards.size === 0) {
      yield* Effect.logDebug("No shards to rebalance")
      return
    }

    // Determine which shards to assign and unassign
    const assignments = MutableHashMap.empty<RunnerAddress, MutableHashSet.MutableHashSet<ShardId>>()
    const unassignments = MutableHashMap.empty<RunnerAddress, MutableHashSet.MutableHashSet<ShardId>>()
    const changes = MutableHashSet.empty<RunnerAddress>()
    for (const group of state.shards.keys()) {
      const [groupAssignments, groupUnassignments, groupChanges] =
        immediate || (state.unassignedShards(group).length > 0)
          ? decideAssignmentsForUnassignedShards(state, group)
          : decideAssignmentsForUnbalancedShards(state, group, config.rebalanceRate)
      for (const [address, shards] of groupAssignments) {
        addAllNested(assignments, address, Array.from(shards, (id) => makeShardId(group, id)))
      }
      for (const [address, shards] of groupUnassignments) {
        addAllNested(unassignments, address, Array.from(shards, (id) => makeShardId(group, id)))
      }
      for (const address of groupChanges) {
        MutableHashSet.add(changes, address)
      }
    }

    yield* Effect.logDebug(`Rebalancing shards (immediate = ${immediate})`)

    if (MutableHashSet.size(changes) === 0) return

    yield* Metric.increment(ClusterMetrics.rebalances)

    // Ping runners first and remove unhealthy ones
    const failedRunners = MutableHashSet.empty<RunnerAddress>()
    for (const address of changes) {
      yield* FiberSet.run(
        rebalanceFibers,
        runnersApi.ping(address).pipe(
          Effect.timeout(config.runnerPingTimeout),
          Effect.catchAll(() => {
            MutableHashSet.add(failedRunners, address)
            MutableHashMap.remove(assignments, address)
            MutableHashMap.remove(unassignments, address)
            return Effect.void
          })
        )
      )
    }
    yield* FiberSet.awaitEmpty(rebalanceFibers)

    const failedUnassignments = new Set<ShardId>()
    for (const [address, shards] of unassignments) {
      yield* FiberSet.run(
        rebalanceFibers,
        updateShardsState(shards, Option.none()).pipe(
          Effect.matchEffect({
            onFailure: () => {
              MutableHashSet.add(failedRunners, address)
              for (const shard of shards) {
                failedUnassignments.add(shard)
              }
              // Remove failed runners from the assignments
              MutableHashMap.remove(assignments, address)
              return Effect.void
            },
            onSuccess: () =>
              PubSub.publish(events, ShardingEvent.ShardsUnassigned({ address, shards: Array.from(shards) }))
          })
        )
      )
    }
    yield* FiberSet.awaitEmpty(rebalanceFibers)

    // Remove failed shard unassignments from the assignments
    MutableHashMap.forEach(assignments, (shards, address) => {
      for (const shard of failedUnassignments) {
        MutableHashSet.remove(shards, shard)
      }
      if (MutableHashSet.size(shards) === 0) {
        MutableHashMap.remove(assignments, address)
      }
    })

    // Perform the assignments
    for (const [address, shards] of assignments) {
      yield* FiberSet.run(
        rebalanceFibers,
        updateShardsState(shards, Option.some(address)).pipe(
          Effect.matchEffect({
            onFailure: () => {
              MutableHashSet.add(failedRunners, address)
              return Effect.void
            },
            onSuccess: () =>
              PubSub.publish(events, ShardingEvent.ShardsAssigned({ address, shards: Array.from(shards) }))
          })
        )
      )
    }
    yield* FiberSet.awaitEmpty(rebalanceFibers)

    updateShardMetrics()

    const wereFailures = MutableHashSet.size(failedRunners) > 0
    if (wereFailures) {
      // Check if the failing runners are still reachable
      yield* Effect.forEach(failedRunners, notifyUnhealthyRunner, { discard: true }).pipe(
        Effect.forkIn(scope)
      )
      yield* Effect.logWarning("Failed to rebalance runners: ", failedRunners)
    }

    if (wereFailures && immediate) {
      // Try rebalancing again later if there were any failures
      yield* Clock.sleep(config.rebalanceRetryInterval).pipe(
        Effect.zipRight(rebalance(immediate)),
        Effect.forkIn(scope)
      )
    }

    yield* persistAssignments
  })

  const checkRunnerHealth: Effect.Effect<void> = Effect.suspend(() =>
    Effect.forEach(MutableHashMap.keys(state.allRunners), notifyUnhealthyRunner, {
      concurrency: 10,
      discard: true
    })
  )

  yield* Effect.addFinalizer(() =>
    persistAssignments.pipe(
      Effect.catchAllCause((cause) => Effect.logWarning("Failed to persist assignments on shutdown", cause)),
      Effect.zipRight(persistRunners.pipe(
        Effect.catchAllCause((cause) => Effect.logWarning("Failed to persist runners on shutdown", cause))
      ))
    )
  )

  yield* Effect.forkIn(persistRunners, scope)

  // Rebalance immediately if there are unassigned shards
  yield* Effect.forkIn(
    rebalance(state.allUnassignedShards.length > 0),
    scope
  )

  // Start a regular cluster rebalance at the configured interval
  yield* rebalance(false).pipe(
    Effect.andThen(Effect.sleep(config.rebalanceInterval)),
    Effect.forever,
    Effect.forkIn(scope)
  )

  yield* checkRunnerHealth.pipe(
    Effect.andThen(Effect.sleep(config.runnerHealthCheckInterval)),
    Effect.forever,
    Effect.forkIn(scope)
  )

  yield* Effect.gen(function*() {
    const queue = yield* PubSub.subscribe(events)
    while (true) {
      yield* Effect.logInfo("Shard manager event:", yield* Queue.take(queue))
    }
  }).pipe(Effect.forkIn(scope))

  yield* Effect.logInfo("Shard manager initialized")

  return ShardManager.of({
    getAssignments,
    shardingEvents: PubSub.subscribe(events),
    register,
    unregister,
    rebalance,
    notifyUnhealthyRunner,
    checkRunnerHealth
  })
})

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer.Layer<
  ShardManager,
  never,
  ShardStorage | RunnerHealth | Runners | Config | ShardingConfig
> = Layer.scoped(ShardManager, make)

/**
 * @since 1.0.0
 * @category Server
 */
export const layerServerHandlers = Rpcs.toLayer(Effect.gen(function*() {
  const shardManager = yield* ShardManager
  const clock = yield* Effect.clock
  return {
    Register: ({ runner }) => shardManager.register(runner),
    Unregister: ({ address }) => shardManager.unregister(address),
    NotifyUnhealthyRunner: ({ address }) => shardManager.notifyUnhealthyRunner(address),
    GetAssignments: () =>
      Effect.map(
        shardManager.getAssignments,
        (assignments) => Array.from(assignments)
      ),
    ShardingEvents: Effect.fnUntraced(function*() {
      const queue = yield* shardManager.shardingEvents
      const mailbox = yield* Mailbox.make<ShardingEvent>()

      yield* mailbox.offer(ShardingEvent.StreamStarted())

      yield* Queue.takeBetween(queue, 1, Number.MAX_SAFE_INTEGER).pipe(
        Effect.flatMap((events) => mailbox.offerAll(events)),
        Effect.forever,
        Effect.forkScoped
      )

      return mailbox
    }),
    GetTime: () => clock.currentTimeMillis
  }
}))

/**
 * @since 1.0.0
 * @category Server
 */
export const layerServer: Layer.Layer<
  never,
  never,
  ShardManager | RpcServer.Protocol
> = RpcServer.layer(Rpcs, {
  spanPrefix: "ShardManager",
  disableTracing: true
}).pipe(Layer.provide(layerServerHandlers))
