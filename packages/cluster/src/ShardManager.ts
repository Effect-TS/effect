/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as FiberSet from "effect/FiberSet"
import { identity } from "effect/Function"
import * as Iterable from "effect/Iterable"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableHashSet from "effect/MutableHashSet"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as ClusterMetrics from "./ClusterMetrics.js"
import {
  decideAssignmentsForUnassignedShards,
  decideAssignmentsForUnbalancedShards,
  PodWithMetadata,
  State
} from "./internal/shardManager.js"
import { Pod } from "./Pod.js"
import { PodAddress } from "./PodAddress.js"
import { Pods } from "./Pods.js"
import { PodsHealth } from "./PodsHealth.js"
import { ShardId } from "./ShardId.js"
import { ShardingConfig } from "./ShardingConfig.js"
import { PodNotRegistered } from "./ShardingError.js"
import { Storage } from "./Storage.js"

/**
 * @since 1.0.0
 * @category models
 */
export class ShardManager extends Context.Tag("@effect/cluster/ShardManager")<ShardManager, {
  /**
   * Get all shard assignments.
   */
  readonly getAssignments: Effect.Effect<
    ReadonlyMap<ShardId, Option.Option<PodAddress>>
  >
  /**
   * Get a stream of sharding events emit by the shard manager.
   */
  readonly getShardingEvents: Stream.Stream<ShardingEvent>
  /**
   * Register a new pod with the cluster.
   */
  readonly register: (pod: Pod) => Effect.Effect<void>
  /**
   * Unregister a pod from the cluster.
   */
  readonly unregister: (address: PodAddress) => Effect.Effect<void>
  /**
   * Rebalance shards assigned to pods within the cluster.
   */
  readonly rebalance: (immediate: boolean) => Effect.Effect<void>
  /**
   * Notify the cluster of an unhealthy pod.
   */
  readonly notifyUnhealthyPod: (address: PodAddress) => Effect.Effect<void>
  /**
   * Check and repot on the health of all pods in the cluster.
   */
  readonly checkPodHealth: Effect.Effect<void>
}>() {}

/**
 * @since 1.0.0
 * @category models
 */
export interface Config {
  /**
   * The port to use to expose the manager API.
   */
  readonly port: number
  /**
   * The number of shards to allocate to a pod.
   *
   * **Note**: this value should be consistent across all pods.
   */
  readonly numberOfShards: number
  /**
   * The interval on which regular rebalancing of shards will occur.
   */
  readonly rebalanceInterval: DurationInput
  /**
   * The interval on which rebalancing of shards which failed to be
   * rebalanced will be retried.
   */
  readonly rebalanceRetryInterval: DurationInput
  /**
   * The maximum ratio of shards to rebalance at once.
   *
   * **Note**: this value should be a number between `0` and `1`.
   */
  readonly rebalanceRate: number
  /**
   * The interval on which persistence of pods will be retried if it fails.
   */
  readonly persistRetryInterval: DurationInput
  /**
   * The number of times persistence of pods will be retried if it fails.
   */
  readonly persistRetryCount: number
  /**
   * The interval on which pod health will be checked.
   */
  readonly podHealthCheckInterval: DurationInput
  /**
   * The length of time to wait for a pod to respond to a ping.
   */
  readonly podPingTimeout: DurationInput
}

/**
 * @since 1.0.0
 * @category Config
 */
export const defaultConfig: Config = {
  port: 3000,
  numberOfShards: 300,
  rebalanceInterval: "20 seconds",
  rebalanceRetryInterval: "10 seconds",
  rebalanceRate: 2 / 100,
  persistRetryCount: 100,
  persistRetryInterval: "3 seconds",
  podHealthCheckInterval: "1 minute",
  podPingTimeout: "3 seconds"
}

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
     * Register a new pod with the cluster.
     */
    readonly register: (address: PodAddress) => Effect.Effect<void>
    /**
     * Unregister a pod from the cluster.
     */
    readonly unregister: (address: PodAddress) => Effect.Effect<void>
    /**
     * Notify the cluster of an unhealthy pod.
     */
    readonly notifyUnhealthyPod: (address: PodAddress) => Effect.Effect<void>
    /**
     * Get all shard assignments.
     */
    readonly getAssignments: Effect.Effect<
      ReadonlyMap<ShardId, Option.Option<PodAddress>>
    >
  }>()
{}

/**
 * Represents configuration required to connect to the `ShardManager`.
 *
 * @since 1.0.0
 * @category models
 */
export interface ClientConfig {
  /**
   * The host of the `ShardManager` instance.
   */
  readonly host: string
  /**
   * The port that the `ShardManager` is exposed on.
   */
  readonly port: number
}

/**
 * @since 1.0.0
 * @category models
 */
export type ShardingEvent = Data.TaggedEnum<{
  readonly ShardsAssigned: {
    readonly address: PodAddress
    readonly shards: Array<ShardId>
  }
  readonly ShardsUnassigned: {
    readonly address: PodAddress
    readonly shards: Array<ShardId>
  }
  readonly PodRegistered: {
    readonly address: PodAddress
  }
  readonly PodUnregistered: {
    readonly address: PodAddress
  }
  readonly PodHealthChecked: {
    readonly address: PodAddress
  }
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
  const address = PodAddress.make({ host: config.host, port: config.port })

  const shards = new Map<ShardId, Option.Option<PodAddress>>()
  for (let n = 1; n <= config.numberOfShards; n++) {
    shards.set(ShardId.make(n), Option.some(address))
  }

  return ShardManagerClient.of({
    register: () => Effect.void,
    unregister: () => Effect.void,
    notifyUnhealthyPod: () => Effect.void,
    getAssignments: Effect.succeed(shards)
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
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(customConfig: Partial<Config> = {}) {
  const storage = yield* Storage
  const podsApi = yield* Pods
  const podsHealthApi = yield* PodsHealth
  const clock = yield* Effect.clock

  const config = Object.assign({}, customConfig, defaultConfig)
  const state = yield* State.fromStorage(config)
  const scope = yield* Effect.scope
  const events = yield* PubSub.unbounded<ShardingEvent>()

  yield* Effect.logInfo("Recovered pods: ", state.pods)
  yield* Effect.logInfo("Recovered assignments: ", state.shards)
  yield* Metric.incrementBy(ClusterMetrics.pods, MutableHashMap.size(state.pods))

  for (const address of state.shards.values()) {
    const metric = Option.isSome(address) ?
      Metric.tagged(ClusterMetrics.assignedShards, "address", address.toString()) :
      ClusterMetrics.unassignedShards
    yield* Metric.increment(metric)
  }

  function withRetry<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<void, never, R> {
    return effect.pipe(
      Effect.retry({
        schedule: Schedule.spaced(config.persistRetryCount),
        times: config.persistRetryCount
      }),
      Effect.ignore
    )
  }

  const persistPods = withRetry(
    Effect.suspend(() =>
      storage.savePods(
        Iterable.map(state.pods, ([address, pod]) => [address, pod.pod])
      )
    )
  )

  const persistAssignments = withRetry(
    Effect.suspend(() => storage.saveShardAssignments(state.shards))
  )

  const notifyUnhealthyPod = Effect.fnUntraced(function*(address: PodAddress) {
    if (!MutableHashMap.has(state.pods, address)) return

    yield* Metric.increment(
      Metric.tagged(ClusterMetrics.podHealthChecked, "pod_address", address.toString())
    )
    yield* PubSub.publish(events, ShardingEvent.PodHealthChecked({ address }))

    if (!(yield* podsHealthApi.isAlive(address))) {
      yield* Effect.logWarning(`Pod at address '${address.toString()}' is not alive`)
      yield* unregister(address)
    }
  })

  function updateShardsState(
    shards: Iterable<ShardId>,
    address: Option.Option<PodAddress>
  ): Effect.Effect<void, PodNotRegistered> {
    return Effect.suspend(() => {
      if (Option.isSome(address) && !MutableHashMap.has(state.pods, address.value)) {
        return Effect.fail(new PodNotRegistered({ address: address.value }))
      }
      for (const shardId of shards) {
        if (!state.shards.has(shardId)) continue
        state.shards.set(shardId, address)
      }
      return Effect.void
    })
  }

  const getAssignments = Effect.sync(() => state.shards)

  const getShardingEvents = Stream.fromPubSub(events)

  const register = Effect.fnUntraced(function*(pod: Pod) {
    yield* Effect.logInfo(`Registering pod ${Pod.pretty(pod)}`)
    const now = clock.unsafeCurrentTimeMillis()
    MutableHashMap.set(state.pods, pod.address, PodWithMetadata({ pod, registeredAt: now }))

    yield* Metric.increment(ClusterMetrics.pods)
    yield* PubSub.publish(events, ShardingEvent.PodRegistered({ address: pod.address }))
    if (state.unassignedShards.length > 0) {
      yield* rebalance(false)
    }
    yield* Effect.forkIn(persistPods, scope)
  })

  const unregister = Effect.fnUntraced(function*(address: PodAddress) {
    if (!MutableHashMap.has(state.pods, address)) return

    yield* Effect.logInfo("Unregistering pod at address:", address)
    const unassignments = Arr.empty<ShardId>()
    for (const [shard, pod] of state.shards) {
      if (Option.isSome(pod) && Equal.equals(pod.value, address)) {
        unassignments.push(shard)
        state.shards.set(shard, Option.none())
      }
    }

    MutableHashMap.remove(state.pods, address)
    yield* Metric.incrementBy(ClusterMetrics.pods, -1)

    if (unassignments.length > 0) {
      yield* Metric.incrementBy(
        Metric.tagged(ClusterMetrics.unassignedShards, "pod_address", address.toString()),
        unassignments.length
      )
      yield* PubSub.publish(events, ShardingEvent.PodUnregistered({ address }))
    }

    yield* Effect.forkIn(persistPods, scope)
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

    // Determine which shards to assign and unassign
    const [assignments, unassignments, changes] = immediate || (state.unassignedShards.length > 0)
      ? decideAssignmentsForUnassignedShards(state)
      : decideAssignmentsForUnbalancedShards(state, config.rebalanceRate)

    yield* Effect.logDebug(`Rebalancing shards (immediate = ${immediate})`)

    if (MutableHashSet.size(changes) === 0) return

    yield* Metric.increment(ClusterMetrics.rebalances)

    // Ping pods first and remove unhealthy ones
    const failedPods = MutableHashSet.empty<PodAddress>()
    for (const address of changes) {
      yield* FiberSet.run(
        rebalanceFibers,
        podsApi.ping(address).pipe(
          Effect.timeout(config.podPingTimeout),
          Effect.catchAll(() => {
            MutableHashSet.add(failedPods, address)
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
        podsApi.unassignShards(address, shards).pipe(
          Effect.zipRight(updateShardsState(shards, Option.none())),
          Effect.matchEffect({
            onFailure: () => {
              MutableHashSet.add(failedPods, address)
              for (const shard of shards) {
                failedUnassignments.add(shard)
              }
              // Remove failed pods from the assignments
              MutableHashMap.remove(assignments, address)
              return Effect.void
            },
            onSuccess: () => {
              const shardCount = shards.size
              return Metric.incrementBy(
                Metric.tagged(ClusterMetrics.assignedShards, "pod_address", address.toString()),
                -shardCount
              ).pipe(
                Effect.zipRight(Metric.incrementBy(ClusterMetrics.unassignedShards, shardCount)),
                Effect.zipRight(
                  PubSub.publish(events, ShardingEvent.ShardsUnassigned({ address, shards: Array.from(shards) }))
                )
              )
            }
          })
        )
      )
    }
    yield* FiberSet.awaitEmpty(rebalanceFibers)

    // Remove failed shard unassignments from the assignments
    MutableHashMap.forEach(assignments, (shards, address) => {
      for (const shard of failedUnassignments) {
        shards.delete(shard)
      }
      if (shards.size === 0) {
        MutableHashMap.remove(assignments, address)
      }
    })

    // Perform the assignments
    for (const [address, shards] of assignments) {
      yield* FiberSet.run(
        rebalanceFibers,
        podsApi.assignShards(address, shards).pipe(
          Effect.zipRight(updateShardsState(shards, Option.some(address))),
          Effect.matchEffect({
            onFailure: () => {
              MutableHashSet.add(failedPods, address)
              return Effect.void
            },
            onSuccess: () => {
              const shardCount = shards.size
              return Metric.incrementBy(
                Metric.tagged(ClusterMetrics.assignedShards, "pod_address", address.toString()),
                -shardCount
              ).pipe(
                Effect.zipRight(Metric.incrementBy(ClusterMetrics.unassignedShards, -shardCount)),
                Effect.zipRight(
                  PubSub.publish(events, ShardingEvent.ShardsAssigned({ address, shards: Array.from(shards) }))
                )
              )
            }
          })
        )
      )
    }
    yield* FiberSet.awaitEmpty(rebalanceFibers)

    const wereFailures = MutableHashSet.size(failedPods) > 0
    if (wereFailures) {
      // Check if the failing pods are still reachable
      yield* Effect.forEach(failedPods, notifyUnhealthyPod, { discard: true }).pipe(
        Effect.forkIn(scope)
      )
      yield* Effect.logWarning("Failed to rebalance pods: ", failedPods)
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

  const checkPodHealth: Effect.Effect<void> = Effect.suspend(() =>
    Effect.forEach(MutableHashMap.keys(state.pods), notifyUnhealthyPod, {
      concurrency: "inherit",
      discard: true
    })
  ).pipe(
    Effect.withConcurrency(4),
    Effect.asVoid
  )

  yield* Effect.addFinalizer(() =>
    persistAssignments.pipe(
      Effect.catchAllCause((cause) => Effect.logWarning("Failed to persist assignments on shutdown", cause)),
      Effect.zipRight(persistPods.pipe(
        Effect.catchAllCause((cause) => Effect.logWarning("Failed to persist pods on shutdown", cause))
      ))
    )
  )

  yield* Effect.forkScoped(persistPods)

  // Rebalance immediately if there are unassigned shards
  yield* Effect.forkScoped(rebalance(state.unassignedShards.length > 0))

  // Start a regular cluster rebalance at the configured interval
  yield* rebalance(false).pipe(
    Effect.repeat(Schedule.spaced(config.rebalanceInterval)),
    Effect.forkScoped
  )

  yield* getShardingEvents.pipe(
    Stream.runForEach((event) => Effect.logInfo(event)),
    Effect.forkScoped
  )

  yield* checkPodHealth.pipe(
    Effect.repeat(Schedule.spaced(config.podHealthCheckInterval)),
    Effect.forkScoped
  )

  yield* Effect.logInfo("Shard manager initialized")

  return {
    getAssignments,
    getShardingEvents,
    register,
    unregister,
    persistPods,
    rebalance,
    notifyUnhealthyPod,
    checkPodHealth
  } as const
})

/**
 * @since 1.0.0
 * @category layer
 */
export const layer = (
  config?: Partial<Config> | undefined
): Layer.Layer<ShardManager, never, Storage | PodsHealth | Pods> => Layer.scoped(ShardManager, make(config))
