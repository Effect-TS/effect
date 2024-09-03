import * as Pretty from "@effect/schema/Pretty"
import * as Schema from "@effect/schema/Schema"
import * as Array from "effect/Array"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import { constFalse, dual, identity, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as PubSub from "effect/PubSub"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as SynchronizedRef from "effect/SynchronizedRef"
import { Pod } from "../Pod.js"
import { PodAddress } from "../PodAddress.js"
import { ShardId } from "../ShardId.js"
import { PodNotRegistered } from "../ShardingException.js"
import type * as ShardManager from "../ShardManager.js"
import * as InternalMetrics from "./metrics.js"
import * as InternalPods from "./pods.js"
import * as InternalPodsHealth from "./podsHealth.js"
import * as InternalStorage from "./storage.js"

const SymbolKey = "@effect/cluster/ShardManager"

/** @internal */
export const TypeId: ShardManager.TypeId = Symbol.for(SymbolKey) as ShardManager.TypeId

const defaultConfig: ShardManager.ShardManager.Config = {
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

const make = (customConfig: Partial<ShardManager.ShardManager.Config> = {}) =>
  Effect.gen(function*() {
    const storage = yield* InternalStorage.Tag
    const podsApi = yield* InternalPods.Tag
    const podsHealthApi = yield* InternalPodsHealth.Tag

    const pods = yield* storage.getPods
    const shardAssignments = yield* storage.getShardAssignments

    const config = Object.assign({}, customConfig, defaultConfig)

    // Service Initialization
    const [failedPods, filtered] = yield* Effect.partition(pods, ([address, pod]) =>
      Effect.if(podsHealthApi.isAlive(address), {
        onTrue: () =>
          Effect.succeed([address, pod] as const),
        onFalse: () => Effect.fail(pod)
      }), { concurrency: HashMap.size(pods) })

    if (Array.isNonEmptyReadonlyArray(failedPods)) {
      const pods = Array.map(failedPods, Pretty.make(Pod))
      yield* Effect.logInfo(`Ignoring pods that are no longer considered alive: ${pods}`)
    }

    const filteredPods = HashMap.fromIterable(filtered)
    const [failed, filteredAssignments] = Array.partitionMap(shardAssignments, (assignment) =>
      HashMap.has(filteredPods, assignment[1])
        ? Either.right(assignment)
        : Either.left(assignment))
    const failedAssignments = Array.filterMap(failed, ([shardId, address]) =>
      Option.isSome(address)
        ? Option.some([shardId, address.value] as const)
        : Option.none())
    if (Array.isNonEmptyReadonlyArray(failedAssignments)) {
      const pretty = Pretty.make(Schema.Tuple(ShardId, PodAddress))
      const assignments = Array.map(failedAssignments, pretty)
      yield* Effect.logWarning(
        "Ignoring shard assignments for pods that " +
          `are no longer considered alive: ${assignments}`
      )
    }

    const now = yield* Clock.currentTimeMillis
    const initialState = new ShardManagerState(
      HashMap.map(filteredPods, (pod) =>
        PodWithMetadata({ pod, registeredAt: now })),
      pipe(
        Array.range(1, config.numberOfShards),
        Array.map((n) =>
          [ShardId.make(n), Option.none<PodAddress>()] as const
        ),
        HashMap.fromIterable,
        HashMap.union(HashMap.fromIterable(filteredAssignments))
      )
    )

    yield* Effect.logInfo(`Recovered pods: ${1}`) // TODO: filteredPods.values
    yield* Effect.logInfo(`Recovered assignments: ${1}`) // TODO: filteredAssignments.values

    yield* Metric.incrementBy(InternalMetrics.pods, HashMap.size(initialState.pods))

    yield* Effect.forEach(initialState.shards, ([, address]) =>
      Option.match(address, {
        onSome: (address) => {
          const taggedGauge = InternalMetrics.assignedShards.pipe(
            Metric.tagged("address", PodAddress.pretty(address))
          )
          return Metric.increment(taggedGauge)
        },
        onNone: () =>
          Metric.increment(InternalMetrics.unassignedShards)
      }), { discard: true })

    // Service Interface
    const scope = yield* Effect.scope
    const state = yield* SynchronizedRef.make(initialState)
    const rebalanceSemaphore = yield* Effect.makeSemaphore(1)
    const events = yield* PubSub.unbounded<ShardManager.ShardManager.ShardingEvent>()

    function withRetry<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<void, never, R> {
      return effect.pipe(
        Effect.retry({
          schedule: Schedule.spaced(config.persistRetryCount),
          times: config.persistRetryCount
        }),
        Effect.ignore
      )
    }

    const persistPods = SynchronizedRef.get(state).pipe(
      Effect.flatMap((state) =>
        state.pods.pipe(
          HashMap.map((meta) =>
            meta.pod
          ),
          storage.savePods
        )
      ),
      withRetry
    )

    const persistAssignments = SynchronizedRef.get(state).pipe(
      Effect.flatMap((state) => storage.saveShardAssignments(state.shards)),
      withRetry
    )

    function notifyUnhealthyPod(address: PodAddress): Effect.Effect<void> {
      const podHealthChecked = InternalMetrics.podHealthChecked.pipe(
        Metric.tagged("pod_address", PodAddress.pretty(address))
      )
      return Metric.increment(podHealthChecked).pipe(
        Effect.zipRight(PubSub.publish(events, ShardingEvent.PodHealthChecked({ address }))),
        Effect.zipRight(
          Effect.logWarning(`Pod at address ${PodAddress.pretty} is not alive`).pipe(
            Effect.zipRight(unregister(address)),
            Effect.unlessEffect(podsHealthApi.isAlive(address))
          )
        ),
        Effect.whenEffect(
          SynchronizedRef.get(state).pipe(
            Effect.map((state) => HashMap.has(state.pods, address))
          )
        ),
        Effect.asVoid
      )
    }

    function updateShardsState(
      shards: HashSet.HashSet<ShardId>,
      address: Option.Option<PodAddress>
    ): Effect.Effect<void, PodNotRegistered> {
      return SynchronizedRef.updateEffect(state, (state) =>
        Option.isSome(address) && !HashMap.has(state.pods, address.value)
          ? Effect.fail(new PodNotRegistered({ address: address.value }))
          : Effect.succeed(
            new ShardManagerState(
              state.pods,
              state.shards.pipe(
                HashMap.map((assignment, shard) =>
                  HashSet.has(shards, shard) ? address : assignment
                )
              )
            )
          ))
    }

    const getAssignments = SynchronizedRef.get(state).pipe(
      Effect.map((state) => state.shards)
    )

    const getShardingEvents = Stream.fromPubSub(events)

    function register(pod: Pod): Effect.Effect<void> {
      return Effect.logInfo(`Registering pod ${Pod.pretty(pod)}`).pipe(
        Effect.zipRight(SynchronizedRef.getAndUpdateEffect(state, (state) =>
          Clock.currentTimeMillis.pipe(
            Effect.map((now) =>
              new ShardManagerState(
                HashMap.set(state.pods, pod.address, PodWithMetadata({ pod, registeredAt: now })),
                state.shards
              )
            )
          ))),
        Effect.flatMap((state) =>
          Metric.increment(InternalMetrics.pods).pipe(
            Effect.zipRight(PubSub.publish(events, ShardingEvent.PodRegistered({ address: pod.address }))),
            Effect.zipRight(HashSet.size(state.unassignedShards) > 0 ? rebalance(false) : Effect.void),
            Effect.zipRight(Effect.forkIn(persistPods, scope))
          )
        ),
        Effect.asVoid
      )
    }

    function unregister(address: PodAddress): Effect.Effect<void> {
      return Effect.logInfo(`Unregistering pod at address: ${PodAddress.pretty(address)}`).pipe(
        Effect.zipRight(SynchronizedRef.modify(state, (state) => {
          const unassignments = state.shards.pipe(
            HashMap.filterMap((pod, shard) =>
              Option.isSome(pod) && Equal.equals(pod.value, address) ? Option.some(shard) : Option.none()
            ),
            HashMap.values,
            HashSet.fromIterable
          )
          const pods = HashMap.remove(state.pods, address)
          const shards = state.shards.pipe(
            HashMap.map((pod) => Option.isSome(pod) && Equal.equals(pod.value, address) ? Option.none() : pod)
          )
          const newState = new ShardManagerState(pods, shards)
          return [unassignments, newState] as const
        })),
        Effect.flatMap((unassignments) => {
          const unassignedShardCount = HashSet.size(unassignments)
          const unassignedShards = InternalMetrics.unassignedShards.pipe(
            Metric.tagged("pod_address", PodAddress.pretty(address))
          )
          return Metric.incrementBy(InternalMetrics.pods, -1).pipe(
            Effect.zipRight(Metric.incrementBy(unassignedShards, unassignedShardCount)),
            Effect.zipRight(PubSub.publish(events, ShardingEvent.PodUnregistered({ address }))),
            Effect.zipRight(
              PubSub.publish(events, ShardingEvent.ShardsUnassigned({ address, shards: unassignments })).pipe(
                Effect.when(() => unassignedShardCount > 0)
              )
            ),
            Effect.zipRight(Effect.forkIn(persistPods, scope)),
            Effect.zipRight(Effect.forkIn(rebalance(true), scope))
          )
        }),
        Effect.whenEffect(
          SynchronizedRef.get(state).pipe(
            Effect.map((state) => HashMap.has(state.pods, address))
          )
        ),
        Effect.asVoid
      )
    }

    function rebalance(immediate: boolean): Effect.Effect<void> {
      return SynchronizedRef.get(state).pipe(
        Effect.flatMap((state) =>
          Effect.gen(function*() {
            // Determine which shards to assign and unassign
            const [assignments, unassignments] = immediate || (HashSet.size(state.unassignedShards) > 0)
              ? decideAssignmentsForUnassignedShards(state)
              : decideAssignmentsForUnbalancedShards(state, config.rebalanceRate)

            const areChanges = HashMap.size(assignments) > 0 || HashMap.size(unassignments) > 0

            yield* Effect.logDebug(`Rebalancing shards (immediate = ${immediate})`)

            if (areChanges) {
              yield* Metric.increment(InternalMetrics.rebalances)
            }

            // Ping pods first and remove unhealthy ones
            const failedPodPings = yield* Effect.forEach(
              HashSet.union(HashMap.keySet(assignments), HashMap.keySet(unassignments)),
              (address) =>
                podsApi.ping(address).pipe(
                  Effect.timeout(config.podPingTimeout),
                  Effect.match({
                    onFailure: () => Array.of(address),
                    onSuccess: () => Array.empty<PodAddress>()
                  })
                ),
              { concurrency: "unbounded" }
            ).pipe(Effect.map((addresses) => HashSet.fromIterable(Array.flatten(addresses))))

            const shardsToRemove = pipe(
              Array.appendAll(assignments, unassignments),
              Array.filter(([address]) => HashSet.has(failedPodPings, address)),
              Array.map(([, shards]) => shards),
              HashSet.fromIterable,
              HashSet.flatMap(identity)
            )

            const readyAssignments = assignments.pipe(
              HashMap.map(HashSet.difference(shardsToRemove)),
              HashMap.filter((shards) => HashSet.size(shards) > 0)
            )
            const readyUnassignments = unassignments.pipe(
              HashMap.map(HashSet.difference(shardsToRemove)),
              HashMap.filter((shards) => HashSet.size(shards) > 0)
            )

            const [failedPodUnassignments, failedShardUnassignments] = yield* Effect.forEach(
              readyUnassignments,
              ([address, shards]) =>
                podsApi.unassignShards(address, shards).pipe(
                  Effect.zipRight(updateShardsState(shards, Option.none())),
                  Effect.matchEffect({
                    onFailure: () => Effect.succeed([Array.of(address), Array.fromIterable(shards)] as const),
                    onSuccess: () => {
                      const shardCount = HashSet.size(shards)
                      const assignedShards = InternalMetrics.assignedShards.pipe(
                        Metric.tagged("pod_address", PodAddress.pretty(address))
                      )
                      return Metric.incrementBy(assignedShards, -shardCount).pipe(
                        Effect.zipRight(Metric.incrementBy(InternalMetrics.unassignedShards, shardCount)),
                        Effect.zipRight(PubSub.publish(events, ShardingEvent.ShardsUnassigned({ address, shards }))),
                        Effect.as([Array.empty<PodAddress>(), Array.empty<ShardId>()] as const)
                      )
                    }
                  })
                ),
              { concurrency: "unbounded" }
            ).pipe(
              Effect.map(Array.unzip),
              Effect.map(([pods, shards]) =>
                [
                  HashSet.fromIterable(Array.flatten(pods)),
                  HashSet.fromIterable(Array.flatten(shards))
                ] as const
              )
            )

            // Remove pod and shard assignments that could not be unassigned
            const filteredAssignments = HashMap.removeMany(readyAssignments, failedPodUnassignments).pipe(
              HashMap.map((shards) => HashSet.difference(shards, failedShardUnassignments))
            )

            // Perform the assignments
            const failedPodAssignments = yield* Effect.forEach(filteredAssignments, ([address, shards]) =>
              podsApi.assignShards(address, shards).pipe(
                Effect.zipRight(updateShardsState(shards, Option.some(address))),
                Effect.matchEffect({
                  onFailure: () =>
                    Effect.succeed(Array.of(address)),
                  onSuccess: () => {
                    const shardCount = HashSet.size(shards)
                    const assignedShards = InternalMetrics.assignedShards.pipe(
                      Metric.tagged("pod_address", PodAddress.pretty(address))
                    )
                    return Metric.incrementBy(assignedShards, shardCount).pipe(
                      Effect.zipRight(Metric.incrementBy(InternalMetrics.unassignedShards, -shardCount)),
                      Effect.zipRight(PubSub.publish(events, ShardingEvent.ShardsAssigned({ address, shards }))),
                      Effect.as(Array.empty<PodAddress>())
                    )
                  }
                })
              ), { concurrency: "unbounded" }).pipe(Effect.map((pods) =>
                HashSet.fromIterable(Array.flatten(pods))
              ))

            const failedPods = failedPodPings.pipe(
              HashSet.union(failedPodUnassignments),
              HashSet.union(failedPodAssignments)
            )

            const wereFailures = HashSet.size(failedPods) > 0
            if (wereFailures) {
              // Check if the failing pods are still reachable
              yield* Effect.forEach(failedPods, notifyUnhealthyPod, { discard: true }).pipe(
                Effect.forkIn(scope)
              )

              const failed = pipe(
                Array.fromIterable(failedPods),
                Array.map((address) => PodAddress.pretty(address))
              )

              yield* Effect.logWarning(`Failed to rebalance pods: ${failed}`)
            }

            if (wereFailures && immediate) {
              // Try rebalancing again later if there were any failures
              yield* Clock.sleep(config.rebalanceRetryInterval).pipe(
                Effect.zipRight(rebalance(immediate)),
                Effect.forkIn(scope)
              )
            }

            // If there were state changes persist them
            if (areChanges) {
              yield* persistAssignments
            }
          })
        ),
        Effect.asVoid,
        rebalanceSemaphore.withPermits(1),
        Effect.withSpan("ShardManager.rebalance", {
          attributes: { immediate }
        })
      )
    }

    const checkPodHealth: Effect.Effect<void> = SynchronizedRef.get(state).pipe(
      Effect.map((state) => HashMap.keySet(state.pods)),
      Effect.flatMap((pods) =>
        Effect.forEach(pods, notifyUnhealthyPod, {
          concurrency: "inherit",
          discard: true
        })
      ),
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
    yield* Effect.forkScoped(rebalance(HashSet.size(initialState.unassignedShards) > 0))

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
      [TypeId]: TypeId,
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

/** @internal */
export const Tag = Context.GenericTag<ShardManager.ShardManager, ShardManager.ShardManager>(SymbolKey)

/** @internal */
export const layer = (config?: Partial<ShardManager.ShardManager.Config>) => Layer.scoped(Tag, make(config))

const ShardingEvent = Data.taggedEnum<ShardManager.ShardManager.ShardingEvent>()

/** @internal */
export class ShardManagerState {
  constructor(
    readonly pods: HashMap.HashMap<PodAddress, PodWithMetadata>,
    readonly shards: HashMap.HashMap<ShardId, Option.Option<PodAddress>>
  ) {}

  get maxVersion(): Option.Option<number> {
    return Array.matchLeft(this.podVersions, {
      onEmpty: () => Option.none(),
      onNonEmpty: (head, tail) =>
        Option.some(
          Array.reduce(tail, head, (max, version) => version > max ? version : max)
        )
    })
  }

  get allPodsHaveMaxVersion(): boolean {
    return this.maxVersion.pipe(
      Option.map((max) => Array.every(this.podVersions, (version) => version === max)),
      Option.getOrElse(constFalse)
    )
  }

  get shardsPerPod(): HashMap.HashMap<PodAddress, HashSet.HashSet<ShardId>> {
    return this.pods.pipe(
      HashMap.map(() => HashSet.empty<ShardId>()),
      HashMap.union(
        HashMap.reduce(
          this.shards,
          HashMap.empty<PodAddress, HashSet.HashSet<ShardId>>(),
          (map, address, shardId) =>
            Option.match(address, {
              onSome: (address) =>
                HashMap.has(map, address)
                  ? HashMap.modify(map, address, HashSet.add(shardId))
                  : HashMap.set(map, address, HashSet.make(shardId)),
              onNone: () => map
            })
        )
      )
    )
  }

  get averageShardsPerPod(): number {
    const podCount = HashMap.size(this.pods)
    return podCount > 0 ? HashMap.size(this.shards) / podCount : 0
  }

  get unassignedShards(): HashSet.HashSet<ShardId> {
    return this.shards.pipe(
      HashMap.filter((address) => Option.isNone(address)),
      HashMap.keySet
    )
  }

  private get podVersions(): ReadonlyArray<number> {
    return pipe(
      Array.fromIterable(HashMap.values(this.pods)),
      Array.map((meta) => meta.pod.version)
    )
  }
}

/** @internal */
export interface PodWithMetadata {
  readonly pod: Pod
  readonly registeredAt: number
}
/** @internal */
export const PodWithMetadata = Data.case<PodWithMetadata>()

/** @internal */
export function decideAssignmentsForUnassignedShards(state: ShardManagerState): readonly [
  assignments: HashMap.HashMap<PodAddress, HashSet.HashSet<ShardId>>,
  unassignments: HashMap.HashMap<PodAddress, HashSet.HashSet<ShardId>>
] {
  return pickNewPods(Array.fromIterable(state.unassignedShards), state, true, 1)
}

/** @internal */
export function decideAssignmentsForUnbalancedShards(state: ShardManagerState, rate: number): readonly [
  assignments: HashMap.HashMap<PodAddress, HashSet.HashSet<ShardId>>,
  unassignments: HashMap.HashMap<PodAddress, HashSet.HashSet<ShardId>>
] {
  const extraShardsToAllocate = state.allPodsHaveMaxVersion
    ? state.shardsPerPod.pipe(
      HashMap.map((shards) => {
        // Count how many extra shards there are compared to the average
        const extraShards = Math.max(0, HashSet.size(shards) - state.averageShardsPerPod)
        const shuffled = Array.take(shuffle(shards), extraShards)
        return HashSet.fromIterable(shuffled)
      }),
      HashMap.values,
      HashSet.fromIterable,
      HashSet.flatMap(identity)
    )
    // Do not perform a regular rebalance in the middle of a rolling update
    : HashSet.empty<ShardId>()

  const sortedShardsToRebalance = extraShardsToAllocate.pipe(
    Array.sortWith((shard) =>
      // Handle unassigned shards, followed by shards on pods with the most
      // shards, and finally shards on old pods
      Option.match(Option.flatten(HashMap.get(state.shards, shard)), {
        onNone: () => [Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER] as const,
        onSome: (address) => {
          const shards = Option.match(HashMap.get(state.shardsPerPod, address), {
            onNone: () => Number.MIN_SAFE_INTEGER,
            onSome: (shards) => -HashSet.size(shards)
          })
          const registeredAt = Option.match(HashMap.get(state.pods, address), {
            onNone: () => Number.MIN_SAFE_INTEGER,
            onSome: (meta) => meta.registeredAt
          })
          return [shards, registeredAt] as const
        }
      }), Order.tuple(Order.number, Order.number))
  )

  return pickNewPods(sortedShardsToRebalance, state, false, rate)
}

function pickNewPods(
  shardsToRebalance: ReadonlyArray<ShardId>,
  state: ShardManagerState,
  immediate: boolean,
  rate: number
): readonly [
  assignments: HashMap.HashMap<PodAddress, HashSet.HashSet<ShardId>>,
  unassignments: HashMap.HashMap<PodAddress, HashSet.HashSet<ShardId>>
] {
  const [, assignments] = Array.reduce(
    shardsToRebalance,
    [state.shardsPerPod, Array.empty<readonly [ShardId, PodAddress]>()] as const,
    ([shardsPerPod, assignments], shard) => {
      // Find all unassigned pods
      const unassignedPods = pipe(
        assignments,
        Array.flatMap(([shardId]) => Array.fromOption(Option.flatten(HashMap.get(state.shards, shardId)))),
        HashSet.fromIterable
      )
      // Find the pod with the fewest assigned shards
      return shardsPerPod.pipe(
        // Keep only pods with the maximum version
        HashMap.filter((_, address) =>
          state.maxVersion.pipe(
            Option.flatMap((maxVersion) =>
              HashMap.get(state.pods, address).pipe(
                Option.map((meta) => meta.pod.version === maxVersion)
              )
            ),
            Option.getOrElse(constFalse)
          )
        ),
        // Do not assign too many shards to each pod unless rebalancing must
        // occur immediately
        HashMap.filter((_, address) =>
          immediate ||
          (Array.reduce(assignments, 0, (acc, tuple) => acc + (Equal.equals(address, tuple[1]) ? 1 : 0)) <
            HashMap.size(state.shards) * rate)
        ),
        // Do not assign to a pod that was unassigned in the same rebalance
        HashMap.filter((_, address) => !HashSet.has(unassignedPods, address)),
        minByOption(([, shards]) => HashSet.size(shards)),
        Option.match({
          onNone: () => [shardsPerPod, assignments] as const,
          onSome: ([address, shards]) => {
            const oldPod = Option.flatten(HashMap.get(state.shards, shard))
            // If the old pod is the same as the new pod, do nothing
            if (Equal.equals(oldPod, Option.some(address))) {
              return [shardsPerPod, assignments] as const
            }
            // If the new pod has one less, as many, or more shards than the
            // old pod, do not change anything
            const oldShardCount = Option.match(oldPod, {
              onNone: () => Number.MAX_SAFE_INTEGER,
              onSome: (address) =>
                HashMap.get(shardsPerPod, address).pipe(
                  Option.map(HashSet.size),
                  Option.getOrElse(() => 0)
                )
            })
            const newShardCount = Option.match(HashMap.get(shardsPerPod, address), {
              onNone: () => 0,
              onSome: HashSet.size
            })
            if (newShardCount + 1 >= oldShardCount) {
              return [shardsPerPod, assignments] as const
            }
            // Otherwise create a new assignment
            const unassigned = Option.match(oldPod, {
              onNone: () => shardsPerPod,
              onSome: (address) => HashMap.modify(shardsPerPod, address, HashSet.remove(shard))
            })
            return [
              HashMap.set(unassigned, address, HashSet.add(shards, shard)),
              Array.prepend(assignments, [shard, address] as const)
            ] as const
          }
        })
      )
    }
  )
  const unassignments = Array.flatMap(assignments, ([shard]) =>
    HashMap.get(state.shards, shard).pipe(
      Option.flatten,
      Option.map((address) => [shard, address] as const),
      Array.fromOption
    ))
  const assignmentsPerPod = groupBy(assignments, ([, address]) => address).pipe(
    HashMap.map(HashSet.map(([shard]) => shard))
  )
  const unassignmentsPerPod = groupBy(unassignments, ([, address]) => address).pipe(
    HashMap.map(HashSet.map(([shard]) => shard))
  )
  return [assignmentsPerPod, unassignmentsPerPod] as const
}

const minByOption = dual<
  <A>(f: (value: A) => number) => (self: Iterable<A>) => Option.Option<A>,
  <A>(self: Iterable<A>, f: (value: A) => number) => Option.Option<A>
>(2, <A>(self: Iterable<A>, f: (value: A) => number) => {
  let current: [A, number] | undefined = undefined
  for (const value of self) {
    if (current === undefined) {
      current = [value, f(value)]
    } else {
      const computed = f(value)
      if (computed < current[1]) {
        current = [value, computed]
      }
    }
  }
  return current === undefined ? Option.none() : Option.some(current[0])
})

const groupBy = dual<
  <A, K>(f: (value: A) => K) => (self: Iterable<A>) => HashMap.HashMap<K, HashSet.HashSet<A>>,
  <A, K>(self: Iterable<A>, f: (value: A) => K) => HashMap.HashMap<K, HashSet.HashSet<A>>
>(2, <A, K>(self: Iterable<A>, f: (value: A) => K) => {
  const array: Array<[K, Array<A>]> = []
  for (const value of self) {
    const key = f(value)
    const index = Array.findFirstIndex(array, (entry) => Equal.equals(entry[0], key))
    if (Option.isSome(index)) {
      array[index.value][1].push(value)
    } else {
      array.push([key, [value]])
    }
  }
  return HashMap.fromIterable(
    Array.map(array, ([key, value]) => [key, HashSet.fromIterable(value)] as const)
  )
})

function shuffle<A>(self: Iterable<A>): ReadonlyArray<A> {
  const array = Array.fromIterable(self)
  let currentIndex = array.length
  while (currentIndex != 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex = currentIndex - 1
    swap(array, currentIndex, randomIndex)
  }
  return array
}

function swap<A>(array: Array<A>, i: number, j: number): ReadonlyArray<A> {
  const tmp = array[i]
  array[i] = array[j]
  array[j] = tmp
  return array
}
