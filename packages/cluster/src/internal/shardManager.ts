/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Clock from "effect/Clock"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import { equals } from "effect/Equal"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as List from "effect/List"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as RefSynchronized from "effect/SynchronizedRef"
import * as ManagerConfig from "../ManagerConfig.js"
import type * as Pod from "../Pod.js"
import type * as PodAddress from "../PodAddress.js"
import * as Pods from "../Pods.js"
import * as PodsHealth from "../PodsHealth.js"
import * as ShardId from "../ShardId.js"
import * as ShardingEvent from "../ShardingEvent.js"
import * as ShardingException from "../ShardingException.js"
import type * as ShardManager from "../ShardManager.js"
import * as Storage from "../Storage.js"
import * as PodWithMetadata from "./podWithMetadata.js"
import * as ShardManagerState from "./shardManagerState.js"
import { groupBy, minByOption } from "./utils.js"

/** @internal */
const ShardManagerSymbolKey = "@effect/cluster/ShardManager"

/** @internal */
export const ShardManagerTypeId: ShardManager.ShardManagerTypeId = Symbol.for(
  ShardManagerSymbolKey
) as ShardManager.ShardManagerTypeId

/** @internal */
export const shardManagerTag = GenericTag<ShardManager.ShardManager>(ShardManagerSymbolKey)

/** @internal */
function make(
  layerScope: Scope.Scope,
  stateRef: RefSynchronized.SynchronizedRef<ShardManagerState.ShardManagerState>,
  rebalanceSemaphore: Effect.Semaphore,
  eventsHub: PubSub.PubSub<ShardingEvent.ShardingEvent>,
  healthApi: PodsHealth.PodsHealth,
  podApi: Pods.Pods,
  stateRepository: Storage.Storage,
  config: ManagerConfig.ManagerConfig
): ShardManager.ShardManager {
  const getAssignments: Effect.Effect<HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>> = pipe(
    RefSynchronized.get(stateRef),
    Effect.map((_) => _.shards)
  )

  const getShardingEvents = Stream.fromPubSub(eventsHub)

  function register(pod: Pod.Pod) {
    return pipe(
      Effect.logDebug("Registering " + (pod.address) + "@" + pod.version),
      Effect.zipRight(
        RefSynchronized.updateAndGetEffect(stateRef, (state) =>
          pipe(
            Effect.flatMap(Effect.clock, (_) => _.currentTimeMillis),
            Effect.map((cdt) =>
              ShardManagerState.make(
                HashMap.set(state.pods, pod.address, PodWithMetadata.make(pod, cdt)),
                state.shards
              )
            )
          ))
      ),
      Effect.zipLeft(PubSub.publish(eventsHub, ShardingEvent.PodRegistered(pod.address))),
      Effect.flatMap((state) => Effect.when(rebalance(false), () => HashSet.size(state.unassignedShards) > 0)),
      Effect.zipRight(Effect.forkIn(layerScope)(persistPods)),
      Effect.asVoid
    )
  }

  function stateHasPod(podAddress: PodAddress.PodAddress) {
    return pipe(
      RefSynchronized.get(stateRef),
      Effect.map((_) => HashMap.has(_.pods, podAddress))
    )
  }

  function notifyUnhealthyPod(podAddress: PodAddress.PodAddress) {
    return pipe(
      Effect.whenEffect(
        pipe(
          PubSub.publish(eventsHub, ShardingEvent.PodHealthChecked(podAddress)),
          Effect.zipRight(
            Effect.unlessEffect(
              Effect.zipRight(
                Effect.logWarning(`${podAddress} is not alive, unregistering`),
                unregister(podAddress)
              ),
              healthApi.isAlive(podAddress)
            )
          )
        ),
        stateHasPod(podAddress)
      ),
      Effect.asVoid
    )
  }

  const checkAllPodsHealth = pipe(
    RefSynchronized.get(stateRef),
    Effect.map((_) => HashMap.keySet(_.pods)),
    Effect.flatMap((_) => (Effect.forEach(_, notifyUnhealthyPod, { concurrency: 4, discard: true })))
  )

  function unregister(podAddress: PodAddress.PodAddress) {
    const eff = pipe(
      Effect.Do,
      Effect.zipLeft(Effect.logDebug(`Unregistering ${podAddress}`)),
      Effect.bind("unassignments", (_) =>
        pipe(
          stateRef,
          RefSynchronized.modify((state) => [
            pipe(
              state.shards,
              HashMap.filter((pod) => equals(pod)(Option.some(podAddress))),
              HashMap.keySet
            ),
            {
              ...state,
              pods: HashMap.remove(state.pods, podAddress),
              shards: HashMap.map(state.shards, (_) => equals(_)(Option.some(podAddress)) ? Option.none() : _)
            }
          ])
        )),
      Effect.tap((_) => PubSub.publish(eventsHub, ShardingEvent.PodUnregistered(podAddress))),
      Effect.tap((_) =>
        Effect.when(
          PubSub.publish(eventsHub, ShardingEvent.ShardsUnassigned(podAddress, _.unassignments)),
          () => HashSet.size(_.unassignments) > 0
        )
      ),
      Effect.zipLeft(Effect.forkIn(layerScope)(persistPods)),
      Effect.zipLeft(Effect.forkIn(layerScope)(rebalance(true)))
    )
    return Effect.asVoid(Effect.whenEffect(eff, stateHasPod(podAddress)))
  }

  function withRetry<A, E>(zio: Effect.Effect<A, E>): Effect.Effect<void> {
    return pipe(
      zio,
      Effect.retry(
        pipe(
          Schedule.spaced(config.persistRetryInterval),
          Schedule.andThen(Schedule.recurs(config.persistRetryCount))
        )
      ),
      Effect.ignore
    )
  }

  const persistAssignments = withRetry(
    pipe(
      RefSynchronized.get(stateRef),
      Effect.flatMap((state) => stateRepository.saveAssignments(state.shards))
    )
  )

  const persistPods = withRetry(
    pipe(
      RefSynchronized.get(stateRef),
      Effect.flatMap((state) => stateRepository.savePods(HashMap.map(state.pods, (v) => v.pod)))
    )
  )

  function updateShardsState(
    shards: HashSet.HashSet<ShardId.ShardId>,
    pod: Option.Option<PodAddress.PodAddress>
  ) {
    return RefSynchronized.updateEffect(stateRef, (state) => {
      if (Option.isSome(pod) && !HashMap.has(state.pods, pod.value)) {
        return Effect.fail(new ShardingException.PodNoLongerRegisteredException({ podAddress: pod.value }))
      }
      return Effect.succeed({
        ...state,
        shards: pipe(
          state.shards,
          HashMap.map((assignment, shard) => HashSet.has(shards, shard) ? pod : assignment)
        )
      })
    })
  }

  function rebalance(rebalanceImmediately: boolean): Effect.Effect<void> {
    const algo = Effect.gen(function*() {
      const state = yield* RefSynchronized.get(stateRef)

      const [assignments, unassignments] = rebalanceImmediately || HashSet.size(state.unassignedShards) > 0
        ? decideAssignmentsForUnassignedShards(state)
        : decideAssignmentsForUnbalancedShards(state, config.rebalanceRate)

      const areChanges = HashMap.size(assignments) > 0 || HashMap.size(unassignments) > 0

      if (areChanges) {
        yield* Effect.logDebug(
          "Rebalance (rebalanceImmidiately=" + JSON.stringify(rebalanceImmediately) + ")"
        )
      }

      const failedPingedPods = yield* pipe(
        HashSet.union(HashMap.keySet(assignments), HashMap.keySet(unassignments)),
        Effect.forEach(
          (pod) =>
            pipe(
              podApi.ping(pod),
              Effect.timeout(config.pingTimeout),
              Effect.match({
                onFailure: () => Chunk.fromIterable([pod]),
                onSuccess: () => Chunk.empty<PodAddress.PodAddress>()
              })
            ),
          { concurrency: "inherit" }
        ),
        Effect.map(Chunk.fromIterable),
        Effect.map((_) => Chunk.flatten(_)),
        Effect.map(HashSet.fromIterable)
      )

      const shardsToRemove = pipe(
        List.fromIterable(assignments),
        List.appendAll(List.fromIterable(unassignments)),
        List.filter(([pod, __]) => HashSet.has(failedPingedPods, pod)),
        List.map(([_, shards]) => List.fromIterable(shards)),
        List.flatMap((_) => _), // TODO: List is missing flatMap
        HashSet.fromIterable
      )

      const readyAssignments = pipe(
        assignments,
        HashMap.map(HashSet.difference(shardsToRemove)),
        HashMap.filter((__) => HashSet.size(__) > 0)
      )

      const readyUnassignments = pipe(
        unassignments,
        HashMap.map(HashSet.difference(shardsToRemove)),
        HashMap.filter((__) => HashSet.size(__) > 0)
      )

      const [failedUnassignedPods, failedUnassignedShards] = yield* pipe(
        Effect.forEach(readyUnassignments, ([pod, shards]) =>
          pipe(
            podApi.unassignShards(pod, shards),
            Effect.zipRight(updateShardsState(shards, Option.none())),
            Effect.matchEffect({
              onFailure: () => Effect.succeed([HashSet.fromIterable([pod]), shards] as const),
              onSuccess: () =>
                pipe(
                  PubSub.publish(eventsHub, ShardingEvent.ShardsUnassigned(pod, shards)),
                  Effect.as(
                    [
                      HashSet.empty<PodAddress.PodAddress>(),
                      HashSet.empty<ShardId.ShardId>()
                    ] as const
                  )
                )
            })
          ), { concurrency: "inherit" }),
        Effect.map(Chunk.fromIterable),
        Effect.map((_) => Chunk.unzip(_)),
        Effect.map(
          ([pods, shards]) => [Chunk.map(pods, Chunk.fromIterable), Chunk.map(shards, Chunk.fromIterable)] as const
        ),
        Effect.map(
          ([pods, shards]) =>
            [
              HashSet.fromIterable(Chunk.flatten(pods)),
              HashSet.fromIterable(Chunk.flatten(shards))
            ] as const
        )
      )

      // remove assignments of shards that couldn't be unassigned, as well as faulty pods.
      const filteredAssignments = pipe(
        HashMap.removeMany(readyAssignments, failedUnassignedPods),
        HashMap.map((shards, __) => HashSet.difference(shards, failedUnassignedShards))
      )

      // then do the assignments
      const failedAssignedPods = yield* pipe(
        Effect.forEach(filteredAssignments, ([pod, shards]) =>
          pipe(
            podApi.assignShards(pod, shards),
            Effect.zipRight(updateShardsState(shards, Option.some(pod))),
            Effect.matchEffect({
              onFailure: () => Effect.succeed(Chunk.fromIterable([pod])),
              onSuccess: () =>
                pipe(
                  PubSub.publish(eventsHub, ShardingEvent.ShardsAssigned(pod, shards)),
                  Effect.as(Chunk.empty())
                )
            })
          ), { concurrency: "inherit" }),
        Effect.map(Chunk.fromIterable),
        Effect.map((_) => Chunk.flatten(_)),
        Effect.map(HashSet.fromIterable)
      )

      const failedPods = HashSet.union(
        HashSet.union(failedPingedPods, failedUnassignedPods),
        failedAssignedPods
      )

      // check if failing pods are still up
      yield* Effect.forkIn(layerScope)(Effect.forEach(failedPods, (_) => notifyUnhealthyPod(_), { discard: true }))

      if (HashSet.size(failedPods) > 0) {
        yield* Effect.logDebug(
          "Failed to rebalance pods: " +
            failedPods +
            " failed pinged: " + failedPingedPods +
            " failed assigned: " + failedAssignedPods +
            " failed unassigned: " + failedUnassignedPods
        )
      }

      // retry rebalancing later if there was any failure
      if (HashSet.size(failedPods) > 0 && rebalanceImmediately) {
        yield* pipe(
          Effect.sleep(config.rebalanceRetryInterval),
          Effect.zipRight(rebalance(rebalanceImmediately)),
          Effect.forkIn(layerScope)
        )
      }

      // persist state changes to Redis
      if (areChanges) {
        yield* Effect.forkIn(layerScope)(persistAssignments)
      }
    })

    return rebalanceSemaphore.withPermits(1)(algo)
  }

  return {
    getAssignments,
    getShardingEvents,
    register,
    unregister,
    persistPods,
    rebalance,
    notifyUnhealthyPod,
    checkAllPodsHealth
  }
}

/** @internal */
export function decideAssignmentsForUnassignedShards(state: ShardManagerState.ShardManagerState) {
  return pickNewPods(List.fromIterable(state.unassignedShards), state, true, 1)
}

/** @internal */
export function decideAssignmentsForUnbalancedShards(
  state: ShardManagerState.ShardManagerState,
  rebalanceRate: number
) {
  // don't do regular rebalance in the middle of a rolling update
  const extraShardsToAllocate = state.allPodsHaveMaxVersion
    ? pipe(
      state.shardsPerPod,
      HashMap.flatMap((shards, _) => {
        // count how many extra shards compared to the average
        const extraShards = Math.max(HashSet.size(shards) - state.averageShardsPerPod.value, 0)
        return pipe(
          HashMap.empty(),
          HashMap.set(_, HashSet.fromIterable(List.take(List.fromIterable(shards), extraShards)))
        )
      }),
      HashSet.fromIterable,
      HashSet.map((_) => _[1]),
      HashSet.flatMap((_) => _)
    )
    : HashSet.empty()

  /*
        TODO: port sortBy

    val sortedShardsToRebalance = extraShardsToAllocate.toList.sortBy { shard =>
      // handle unassigned shards first, then shards on the pods with most shards, then shards on old pods
      state.shards.get(shard).flatten.fold((Int.MinValue, OffsetDateTime.MIN)) { pod =>
        (
          state.shardsPerPod.get(pod).fold(Int.MinValue)(-_.size),
          state.pods.get(pod).fold(OffsetDateTime.MIN)(_.registered)
        )
      }
    }
* */
  const sortedShardsToRebalance = List.fromIterable(extraShardsToAllocate)
  return pickNewPods(sortedShardsToRebalance, state, false, rebalanceRate)
}

function pickNewPods(
  shardsToRebalance: List.List<ShardId.ShardId>,
  state: ShardManagerState.ShardManagerState,
  rebalanceImmediately: boolean,
  rebalanceRate: number
): readonly [
  assignments: HashMap.HashMap<PodAddress.PodAddress, HashSet.HashSet<ShardId.ShardId>>,
  unassignments: HashMap.HashMap<PodAddress.PodAddress, HashSet.HashSet<ShardId.ShardId>>
] {
  const [_, assignments] = pipe(
    List.reduce(
      shardsToRebalance,
      [
        state.shardsPerPod,
        List.empty<readonly [ShardId.ShardId, PodAddress.PodAddress]>()
      ] as const,
      ([shardsPerPod, assignments], shard) => {
        const unassignedPods = pipe(
          assignments,
          List.flatMap(([shard, _]) =>
            pipe(
              HashMap.get(state.shards, shard),
              Option.flatten,
              Option.toArray,
              List.fromIterable
            )
          )
        )

        // find pod with least amount of shards
        return pipe(
          // keep only pods with the max version
          HashMap.filter(shardsPerPod, (_, pod) => {
            const maxVersion = state.maxVersion
            if (Option.isNone(maxVersion)) return true
            return pipe(
              HashMap.get(state.pods, pod),
              Option.map(PodWithMetadata.extractVersion),
              Option.map((_) => PodWithMetadata.compareVersion(_, maxVersion.value) === 0),
              Option.getOrElse(() => false)
            )
          }),
          // don't assign too many shards to the same pods, unless we need rebalance immediately
          HashMap.filter((_, pod) => {
            if (rebalanceImmediately) return true
            return (
              pipe(
                assignments,
                List.filter(([_, p]) => equals(p)(pod)),
                List.size
              ) <
                HashMap.size(state.shards) * rebalanceRate
            )
          }),
          // don't assign to a pod that was unassigned in the same rebalance
          HashMap.filter(
            (_, pod) => !Option.isSome(List.findFirst(unassignedPods, equals(pod)))
          ),
          minByOption(([_, pods]) => HashSet.size(pods)),
          Option.match({
            onNone: () => [shardsPerPod, assignments] as const,
            onSome: ([pod, shards]) => {
              const oldPod = Option.flatten(HashMap.get(state.shards, shard))
              // if old pod is same as new pod, don't change anything
              if (equals(oldPod)(pod)) {
                return [shardsPerPod, assignments] as const
                // if the new pod has more, as much, or only 1 less shard than the old pod, don't change anything
              } else if (
                Option.match(HashMap.get(shardsPerPod, pod), { onNone: () => 0, onSome: HashSet.size }) + 1 >=
                  Option.match(
                    oldPod,
                    {
                      onNone: () => Number.MAX_SAFE_INTEGER,
                      onSome: (_) =>
                        Option.match(HashMap.get(shardsPerPod, _), { onNone: () => 0, onSome: HashSet.size })
                    }
                  )
              ) {
                return [shardsPerPod, assignments] as const

                // otherwise, create a new assignment
              } else {
                const unassigned = Option.match(
                  oldPod,
                  {
                    onNone: () => shardsPerPod,
                    onSome: (oldPod) => HashMap.modify(shardsPerPod, oldPod, HashSet.remove(shard))
                  }
                )
                return [
                  HashMap.modify(unassigned, pod, (_) => HashSet.add(shards, shard)),
                  List.prepend(assignments, [shard, pod] as const)
                ] as const
              }
            }
          })
        )
      }
    )
  )

  const unassignments = List.flatMap(assignments, ([shard, _]) =>
    pipe(
      Option.flatten(HashMap.get(state.shards, shard)),
      Option.map((_) => [shard, _] as const),
      Option.match({ onNone: List.empty, onSome: List.of })
    ))

  const assignmentsPerPod = pipe(
    assignments,
    groupBy(([_, pod]) => pod),
    HashMap.map(HashSet.map(([shardId, _]) => shardId))
  )
  const unassignmentsPerPod = pipe(
    unassignments,
    groupBy(([_, pod]) => pod),
    HashMap.map(HashSet.map(([shardId, _]) => shardId))
  )
  return [assignmentsPerPod, unassignmentsPerPod] as const
}

/**
 * @since 1.0.0
 * @category layers
 */
export const live = Effect.gen(function*() {
  const config = yield* ManagerConfig.ManagerConfig
  const stateRepository = yield* Storage.Storage
  const healthApi = yield* PodsHealth.PodsHealth
  const podsApi = yield* Pods.Pods
  const layerScope = yield* Effect.scope

  const pods = yield* stateRepository.getPods
  const assignments = yield* stateRepository.getAssignments

  const filteredPods = yield* pipe(
    Effect.filter(pods, ([podAddress]) => healthApi.isAlive(podAddress), { concurrency: "inherit" }),
    Effect.map(HashMap.fromIterable)
  )
  const filteredAssignments = HashMap.filter(
    assignments,
    (pod) => Option.isSome(pod) && HashMap.has(filteredPods, pod.value)
  )
  const cdt = yield* Clock.currentTimeMillis
  const initialState = ShardManagerState.make(
    HashMap.map(filteredPods, (pod) => PodWithMetadata.make(pod, cdt)),
    HashMap.union(
      filteredAssignments,
      pipe(
        Chunk.range(1, config.numberOfShards),
        Chunk.map((n) => [ShardId.make(n), Option.none()] as const),
        HashMap.fromIterable
      )
    )
  )
  const state = yield* RefSynchronized.make(initialState)
  const rebalanceSemaphore = yield* Effect.makeSemaphore(1)
  const eventsHub = yield* PubSub.unbounded<ShardingEvent.ShardingEvent>()
  const shardManager = make(
    layerScope,
    state,
    rebalanceSemaphore,
    eventsHub,
    healthApi,
    podsApi,
    stateRepository,
    config
  )
  yield* Effect.forkIn(layerScope)(shardManager.persistPods)
  // rebalance immediately if there are unassigned shards
  yield* shardManager.rebalance(HashSet.size(initialState.unassignedShards) > 0)
  // start a regular rebalance at the given interval
  yield* pipe(
    shardManager.rebalance(false),
    Effect.repeat(Schedule.spaced(config.rebalanceInterval)),
    Effect.forkIn(layerScope)
  )
  // log info events
  yield* pipe(
    shardManager.getShardingEvents,
    Stream.mapEffect((_) => Effect.logDebug(JSON.stringify(_))),
    Stream.runDrain,
    Effect.forkIn(layerScope)
  )
  yield* Effect.logDebug("Shard Manager loaded")
  return shardManager
}).pipe(Layer.scoped(shardManagerTag))
