import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Either from "effect/Either"
import { equals } from "effect/Equal"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as List from "effect/List"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Synchronized from "effect/SynchronizedRef"
import * as Unify from "effect/Unify"
import type * as Broadcaster from "../Broadcaster.js"
import * as Message from "../Message.js"
import * as MessageState from "../MessageState.js"
import type { Messenger } from "../Messenger.js"
import * as PodAddress from "../PodAddress.js"
import * as Pods from "../Pods.js"
import * as RecipientAddress from "../RecipientAddress.js"
import type * as RecipientBehaviour from "../RecipientBehaviour.js"
import type * as RecipientBehaviourContext from "../RecipientBehaviourContext.js"
import * as RecipientType from "../RecipientType.js"
import * as Serialization from "../Serialization.js"
import * as SerializedEnvelope from "../SerializedEnvelope.js"
import type * as SerializedMessage from "../SerializedMessage.js"
import * as ShardId from "../ShardId.js"
import type * as Sharding from "../Sharding.js"
import * as ShardingConfig from "../ShardingConfig.js"
import * as ShardingException from "../ShardingException.js"
import * as ShardingRegistrationEvent from "../ShardingRegistrationEvent.js"
import * as ShardManagerClient from "../ShardManagerClient.js"
import * as Storage from "../Storage.js"
import * as EntityManager from "./entityManager.js"

/** @internal */
const ShardingSymbolKey = "@effect/cluster/Sharding"

/** @internal */
export const ShardingTypeId: Sharding.ShardingTypeId = Symbol.for(ShardingSymbolKey) as Sharding.ShardingTypeId

/**
 * @internal
 */
export const shardingTag: Context.Tag<Sharding.Sharding, Sharding.Sharding> = Context.GenericTag<Sharding.Sharding>(
  ShardingSymbolKey
)

/**
 * @internal
 */
export const register: Effect.Effect<void, never, Sharding.Sharding> = Effect.flatMap(shardingTag, (_) => _.register)

/**
 * @internal
 */
export const unregister: Effect.Effect<void, never, Sharding.Sharding> = Effect.flatMap(
  shardingTag,
  (_) => _.unregister
)

/**
 * @internal
 */
export const registerScoped: Effect.Effect<void, never, Sharding.Sharding | Scope.Scope> = pipe(
  register,
  Effect.zipRight(Effect.addFinalizer(() => unregister))
)

/**
 * @internal
 */
export function registerSingleton<R>(
  name: string,
  run: Effect.Effect<void, never, R>
): Effect.Effect<void, never, R | Sharding.Sharding> {
  return Effect.flatMap(shardingTag, (_) => _.registerSingleton(name, run))
}

/**
 * @internal
 */
export function registerEntity<Msg extends Message.Message.Any>(
  entityType: RecipientType.EntityType<Msg>
) {
  return <R>(
    behavior: RecipientBehaviour.RecipientBehaviour<Msg, R>,
    options?: RecipientBehaviour.EntityBehaviourOptions
  ): Effect.Effect<void, never, Sharding.Sharding | Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>> =>
    Effect.flatMap(shardingTag, (_) => _.registerEntity(entityType)(behavior, options))
}

/**
 * @internal
 */
export function registerTopic<Msg extends Message.Message.Any>(
  topicType: RecipientType.TopicType<Msg>
) {
  return <R>(
    behavior: RecipientBehaviour.RecipientBehaviour<Msg, R>,
    options?: RecipientBehaviour.EntityBehaviourOptions
  ): Effect.Effect<void, never, Sharding.Sharding | Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>> =>
    Effect.flatMap(shardingTag, (_) => _.registerTopic(topicType)(behavior, options))
}

/**
 * @internal
 */
export function messenger<Msg extends Message.Message.Any>(
  entityType: RecipientType.EntityType<Msg>
): Effect.Effect<Messenger<Msg>, never, Sharding.Sharding> {
  return Effect.map(shardingTag, (_) => _.messenger(entityType))
}

/**
 * @internal
 */
export function broadcaster<Msg extends Message.Message.Any>(
  topicType: RecipientType.TopicType<Msg>
): Effect.Effect<Broadcaster.Broadcaster<Msg>, never, Sharding.Sharding> {
  return Effect.map(shardingTag, (_) => _.broadcaster(topicType))
}

/**
 * @internal
 */
export const getPods: Effect.Effect<HashSet.HashSet<PodAddress.PodAddress>, never, Sharding.Sharding> = Effect.flatMap(
  shardingTag,
  (_) => _.getPods
)

/**
 * @internal
 */
export const sendMessageToLocalEntityManagerWithoutRetries: (
  message: SerializedEnvelope.SerializedEnvelope
) => Effect.Effect<
  MessageState.MessageState<SerializedMessage.SerializedMessage>,
  ShardingException.ShardingException,
  Sharding.Sharding
> = (message) => Effect.flatMap(shardingTag, (_) => _.sendMessageToLocalEntityManagerWithoutRetries(message))

/**
 * @internal
 */
export const getAssignedShardIds: Effect.Effect<
  HashSet.HashSet<ShardId.ShardId>,
  never,
  Sharding.Sharding
> = Effect.flatMap(shardingTag, (_) => _.getAssignedShardIds)

type SingletonEntry = [string, Effect.Effect<void>, Option.Option<Fiber.Fiber<void>>]

/**
 * @internal
 */
function make(
  layerScope: Scope.Scope,
  address: PodAddress.PodAddress,
  config: ShardingConfig.ShardingConfig,
  shardAssignments: Ref.Ref<HashMap.HashMap<ShardId.ShardId, PodAddress.PodAddress>>,
  entityManagers: Ref.Ref<HashMap.HashMap<string, EntityManager.EntityManager>>,
  singletons: Synchronized.SynchronizedRef<
    List.List<SingletonEntry>
  >,
  lastUnhealthyNodeReported: Ref.Ref<number>,
  isShuttingDownRef: Ref.Ref<boolean>,
  shardManager: ShardManagerClient.ShardManagerClient,
  pods: Pods.Pods,
  storage: Storage.Storage,
  serialization: Serialization.Serialization,
  eventsHub: PubSub.PubSub<ShardingRegistrationEvent.ShardingRegistrationEvent>
) {
  function getEntityManagerByEntityTypeName(
    entityType: string
  ) {
    return pipe(
      Ref.get(entityManagers),
      Effect.map(HashMap.get(entityType)),
      Effect.flatMap((_) =>
        Unify.unify(Option.match(_, {
          onNone: () =>
            Effect.fail(new ShardingException.EntityTypeNotRegisteredException({ entityType, podAddress: address })),
          onSome: (entityManager) => Effect.succeed(entityManager as EntityManager.EntityManager)
        }))
      )
    )
  }

  function getShardId(recipientAddress: RecipientAddress.RecipientAddress): ShardId.ShardId {
    return RecipientType.getShardId(recipientAddress.entityId, config.numberOfShards)
  }

  const register: Effect.Effect<void> = pipe(
    Effect.logDebug(`Registering pod ${address} to Shard Manager`),
    Effect.zipRight(pipe(isShuttingDownRef, Ref.set(false))),
    Effect.zipRight(shardManager.register(address))
  )

  const unregister: Effect.Effect<void> = pipe(
    Effect.logDebug("Begin unregistering from ShardManager..."),
    Effect.zipRight(shardManager.getAssignments),
    Effect.matchCauseEffect({
      onFailure: (_) => Effect.logWarning("Shard Manager not available. Can't unregister cleanly", _),
      onSuccess: () =>
        pipe(
          Effect.logDebug(`Stopping local entities`),
          Effect.zipRight(pipe(isShuttingDownRef, Ref.set(true))),
          Effect.zipRight(
            pipe(
              Ref.get(entityManagers),
              Effect.flatMap(
                Effect.forEach(
                  ([name, entityManager]) =>
                    pipe(
                      entityManager.terminateAllEntities,
                      Effect.catchAllCause(
                        (_) => Effect.logError("Error during stop of entity " + name, _)
                      )
                    ),
                  { discard: true }
                )
              )
            )
          ),
          Effect.zipRight(
            Effect.logDebug(`Unregistering pod ${address} to Shard Manager`)
          ),
          Effect.zipRight(shardManager.unregister(address))
        )
    })
  )

  const isSingletonNode: Effect.Effect<boolean> = pipe(
    Ref.get(shardAssignments),
    Effect.map((_) =>
      pipe(
        HashMap.get(_, ShardId.make(1)),
        Option.match({
          onNone: () => false,
          onSome: equals(address)
        })
      )
    )
  )

  const startSingletonsIfNeeded: Effect.Effect<void> = pipe(
    Synchronized.updateEffect(
      singletons,
      (singletons) =>
        pipe(
          Effect.forEach(singletons, ([name, run, maybeExecutionFiber]) =>
            Option.match(
              maybeExecutionFiber,
              {
                onNone: () =>
                  pipe(
                    Effect.logDebug("Starting singleton " + name),
                    Effect.zipRight(
                      Effect.map(
                        Effect.forkIn(layerScope)(run),
                        (fiber) => [name, run, Option.some(fiber)] as SingletonEntry
                      )
                    )
                  ),
                onSome: (_) => Effect.succeed([name, run, maybeExecutionFiber] as SingletonEntry)
              }
            )),
          Effect.map(List.fromIterable)
        )
    ),
    Effect.whenEffect(isSingletonNode),
    Effect.asVoid
  )

  const stopSingletonsIfNeeded: Effect.Effect<void> = pipe(
    Synchronized.updateEffect(
      singletons,
      (singletons) =>
        pipe(
          Effect.forEach(singletons, ([name, run, maybeExecutionFiber]) =>
            Option.match(
              maybeExecutionFiber,
              {
                onNone: () => Effect.succeed([name, run, maybeExecutionFiber] as SingletonEntry),
                onSome: (fiber) =>
                  pipe(
                    Effect.logDebug("Stopping singleton " + name),
                    Effect.zipRight(
                      Effect.as(Fiber.interrupt(fiber), [name, run, Option.none()] as SingletonEntry)
                    )
                  )
              }
            )),
          Effect.map(List.fromIterable)
        )
    ),
    Effect.unlessEffect(isSingletonNode),
    Effect.asVoid
  )

  function registerSingleton<R>(name: string, run: Effect.Effect<void, never, R>): Effect.Effect<void, never, R> {
    return pipe(
      Effect.context<R>(),
      Effect.flatMap((context) =>
        Synchronized.update(
          singletons,
          (list) => (List.prepend(list, [name, Effect.provide(run, context), Option.none()] as SingletonEntry))
        )
      ),
      Effect.zipLeft(startSingletonsIfNeeded),
      Effect.zipRight(PubSub.publish(eventsHub, ShardingRegistrationEvent.SingletonRegistered(name)))
    )
  }

  const isShuttingDown: Effect.Effect<boolean> = Ref.get(isShuttingDownRef)

  function assign(shards: HashSet.HashSet<ShardId.ShardId>): Effect.Effect<void> {
    return pipe(
      Ref.update(shardAssignments, (_) => HashSet.reduce(shards, _, (_, shardId) => HashMap.set(_, shardId, address))),
      Effect.zipRight(startSingletonsIfNeeded),
      Effect.zipLeft(Effect.logDebug("Assigned shards: " + shards)),
      Effect.unlessEffect(isShuttingDown),
      Effect.asVoid
    )
  }

  function unassign(shards: HashSet.HashSet<ShardId.ShardId>): Effect.Effect<void> {
    return pipe(
      Ref.update(shardAssignments, (_) =>
        HashSet.reduce(shards, _, (_, shardId) => {
          const value = HashMap.get(_, shardId)
          if (Option.isSome(value) && equals(value.value, address)) {
            return HashMap.remove(_, shardId)
          }
          return _
        })),
      Effect.zipRight(stopSingletonsIfNeeded),
      Effect.zipLeft(Effect.logDebug("Unassigning shards: " + shards))
    )
  }

  function getPodAddressForShardId(
    shardId: ShardId.ShardId
  ): Effect.Effect<Option.Option<PodAddress.PodAddress>> {
    return pipe(
      Ref.get(shardAssignments),
      Effect.map((shards) => HashMap.get(shards, shardId))
    )
  }

  function isEntityOnLocalShards(
    recipientAddress: RecipientAddress.RecipientAddress
  ): Effect.Effect<boolean> {
    return pipe(
      getPodAddressForShardId(getShardId(recipientAddress)),
      Effect.map((_) => equals(_, Option.some(address)))
    )
  }

  const getPods: Effect.Effect<HashSet.HashSet<PodAddress.PodAddress>> = pipe(
    Ref.get(shardAssignments),
    Effect.map((_) => HashSet.fromIterable(HashMap.values(_)))
  )

  const getAssignedShardIds: Effect.Effect<HashSet.HashSet<ShardId.ShardId>> = pipe(
    Ref.get(shardAssignments),
    Effect.map(HashMap.filter((_) => equals(_, address))),
    Effect.map(HashMap.keySet)
  )

  function updateAssignments(
    assignmentsOpt: HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>,
    fromShardManager: boolean
  ) {
    const assignments = HashMap.map(assignmentsOpt, (v, _) => Option.getOrElse(v, () => address))

    if (fromShardManager) {
      return Ref.update(shardAssignments, (map) => (HashMap.isEmpty(map)) ? assignments : map)
    }

    return Ref.update(shardAssignments, (map) => {
      // we keep self assignments (we don't override them with the new assignments
      // because only the Shard Manager is able to change assignments of the current node, via assign/unassign
      return HashMap.union(
        pipe(
          assignments,
          HashMap.filter((pod, _) => !equals(pod, address))
        ),
        pipe(
          map,
          HashMap.filter((pod, _) => equals(pod, address))
        )
      )
    })
  }

  const refreshAssignments: Effect.Effect<void, never, Scope.Scope> = pipe(
    Stream.fromEffect(Effect.map(shardManager.getAssignments, (_) => [_, true] as const)),
    Stream.merge(
      pipe(
        storage.assignmentsStream,
        Stream.map((_) => [_, false] as const)
      )
    ),
    Stream.mapEffect(([assignmentsOpt, fromShardManager]) => updateAssignments(assignmentsOpt, fromShardManager)),
    Stream.tap(() => startSingletonsIfNeeded),
    Stream.runDrain,
    Effect.retry(Schedule.fixed(config.refreshAssignmentsRetryInterval)),
    Effect.interruptible,
    Effect.forkScoped,
    Effect.asVoid
  )

  function sendMessageToLocalEntityManagerWithoutRetries(
    envelope: SerializedEnvelope.SerializedEnvelope
  ): Effect.Effect<
    MessageState.MessageState<SerializedMessage.SerializedMessage>,
    ShardingException.ShardingException
  > {
    return pipe(
      getEntityManagerByEntityTypeName(envelope.recipientAddress.recipientTypeName),
      Effect.flatMap((entityManager) => entityManager.sendAndGetState(envelope)),
      Effect.annotateLogs("envelope", envelope)
    )
  }

  function sendMessageToRemotePodWithoutRetries(
    pod: PodAddress.PodAddress,
    envelope: SerializedEnvelope.SerializedEnvelope
  ): Effect.Effect<
    MessageState.MessageState<SerializedMessage.SerializedMessage>,
    ShardingException.ShardingException
  > {
    return pipe(
      pods.sendAndGetState(pod, envelope),
      Effect.tapError((error) => {
        if (ShardingException.isPodUnavailableException(error)) {
          const notify = pipe(
            Clock.currentTimeMillis,
            Effect.flatMap((cdt) =>
              pipe(
                Ref.updateAndGet(lastUnhealthyNodeReported, (old) =>
                  old + Duration.toMillis(config.unhealthyPodReportInterval) < cdt ? cdt : old),
                Effect.map((_) =>
                  _ === cdt
                )
              )
            )
          )

          return pipe(
            shardManager.notifyUnhealthyPod(pod),
            Effect.zipRight(shardManager.getAssignments),
            Effect.flatMap((_) => updateAssignments(_, true)),
            Effect.forkDaemon,
            Effect.whenEffect(notify),
            Effect.asVoid
          )
        }
        return Effect.void
      }),
      Effect.annotateLogs("pod", pod),
      Effect.annotateLogs("envelope", envelope)
    )
  }

  function sendMessageToPodWithoutRetries(
    pod: PodAddress.PodAddress,
    envelope: SerializedEnvelope.SerializedEnvelope
  ): Effect.Effect<
    MessageState.MessageState<SerializedMessage.SerializedMessage>,
    ShardingException.ShardingException
  > {
    return equals(pod, address)
      ? sendMessageToLocalEntityManagerWithoutRetries(envelope)
      : sendMessageToRemotePodWithoutRetries(pod, envelope)
  }

  function messenger<Msg extends Message.Message.Any>(
    entityType: RecipientType.EntityType<Msg>
  ): Messenger<Msg> {
    function sendDiscard(entityId: string) {
      return (message: Msg) =>
        pipe(
          sendMessage(entityId, message),
          Effect.asVoid
        )
    }

    function send(entityId: string) {
      return <A extends Msg & Message.Message.Any>(message: A) => {
        return pipe(
          sendMessage(entityId, message),
          Effect.flatMap((state) =>
            MessageState.mapEffect(state, (body) => serialization.decode(Message.exitSchema(message), body))
          ),
          Effect.flatMap((state) =>
            Unify.unify(pipe(
              state,
              MessageState.match({
                onAcknowledged: () => Effect.fail(new ShardingException.NoResultInProcessedMessageStateException()),
                onProcessed: (state) => Effect.succeed(state.result)
              })
            ))
          ),
          Effect.retry(pipe(
            Schedule.fixed(100),
            Schedule.whileInput((error: unknown) => ShardingException.isNoResultInProcessedMessageStateException(error))
          )),
          Effect.flatten,
          Effect.interruptible
        )
      }
    }

    function sendMessage<A extends Msg>(
      entityId: string,
      message: A
    ): Effect.Effect<
      MessageState.MessageState<SerializedMessage.SerializedMessage>,
      ShardingException.ShardingException
    > {
      const recipientAddress = RecipientAddress.makeRecipientAddress(entityType.name, entityId)
      const shardId = getShardId(recipientAddress)

      return Effect.flatMap(serialization.encode(entityType.schema, message), (body) =>
        pipe(
          getPodAddressForShardId(shardId),
          Effect.flatMap((pod) =>
            Option.isSome(pod)
              ? Effect.succeed(pod.value)
              : Effect.fail(new ShardingException.EntityNotManagedByThisPodException({ recipientAddress }))
          ),
          Effect.flatMap((pod) =>
            sendMessageToPodWithoutRetries(
              pod,
              SerializedEnvelope.make(
                recipientAddress,
                PrimaryKey.value(message),
                body
              )
            )
          ),
          Effect.retry(pipe(
            Schedule.fixed(Duration.millis(100)),
            Schedule.whileInput((error: unknown) =>
              ShardingException.isPodUnavailableException(error) ||
              ShardingException.isEntityNotManagedByThisPodException(error)
            )
          ))
        ))
    }

    return { sendDiscard, send }
  }

  function broadcaster<Msg extends Message.Message.Any>(
    topicType: RecipientType.TopicType<Msg>
  ): Broadcaster.Broadcaster<Msg> {
    function sendMessage<A extends Msg>(
      topicId: string,
      message: A
    ): Effect.Effect<
      HashMap.HashMap<
        PodAddress.PodAddress,
        Either.Either<
          MessageState.MessageState<SerializedMessage.SerializedMessage>,
          ShardingException.ShardingException
        >
      >,
      ShardingException.ShardingException
    > {
      return Effect.flatMap(serialization.encode(topicType.schema, message), (body) =>
        pipe(
          getPods,
          Effect.flatMap((pods) =>
            Effect.forEach(
              pods,
              (pod) =>
                pipe(
                  sendMessageToPodWithoutRetries(
                    pod,
                    SerializedEnvelope.make(
                      RecipientAddress.makeRecipientAddress(topicType.name, topicId),
                      PrimaryKey.value(message),
                      body
                    )
                  ),
                  Effect.retry(pipe(
                    Schedule.fixed(Duration.millis(100)),
                    Schedule.whileInput((error: unknown) =>
                      ShardingException.isPodUnavailableException(error) ||
                      ShardingException.isEntityNotManagedByThisPodException(error)
                    )
                  )),
                  Effect.either,
                  Effect.map((res) => [pod, res] as const)
                ),
              { concurrency: "inherit" }
            )
          ),
          Effect.map((_) => HashMap.fromIterable(_))
        ))
    }

    function broadcastDiscard(topicId: string) {
      return (message: Msg) =>
        pipe(
          sendMessage(topicId, message),
          Effect.asVoid
        )
    }

    function broadcast(topicId: string) {
      return <A extends Msg & Message.Message.Any>(message: A) => {
        return pipe(
          sendMessage(topicId, message),
          Effect.flatMap((results) =>
            pipe(
              Effect.forEach(results, ([pod, eitherResult]) =>
                pipe(
                  eitherResult,
                  Effect.flatMap((state) =>
                    MessageState.mapEffect(state, (body) => serialization.decode(Message.exitSchema(message), body))
                  ),
                  Effect.flatMap((state) =>
                    Unify.unify(pipe(
                      state,
                      MessageState.match({
                        onAcknowledged: () =>
                          Effect.fail(new ShardingException.NoResultInProcessedMessageStateException()),
                        onProcessed: (state) => Effect.succeed(state.result)
                      })
                    ))
                  ),
                  Effect.retry(pipe(
                    Schedule.fixed(100),
                    Schedule.whileInput((error: unknown) =>
                      ShardingException.isNoResultInProcessedMessageStateException(error)
                    )
                  )),
                  Effect.flatMap((_) => _),
                  Effect.either,
                  Effect.map((res) => [pod, res] as const)
                ))
            )
          ),
          Effect.map((_) => HashMap.fromIterable(_))
        )
      }
    }

    return { broadcast, broadcastDiscard }
  }

  function registerEntity<Msg extends Message.Message.Any>(
    entityType: RecipientType.EntityType<Msg>
  ) {
    return <R>(
      behavior: RecipientBehaviour.RecipientBehaviour<Msg, R>,
      options?: RecipientBehaviour.EntityBehaviourOptions
    ): Effect.Effect<void, never, Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>> =>
      pipe(
        registerRecipient(entityType, behavior, options),
        Effect.zipRight(PubSub.publish(eventsHub, ShardingRegistrationEvent.EntityRegistered(entityType))),
        Effect.asVoid
      )
  }

  function registerTopic<Msg extends Message.Message.Any>(
    topicType: RecipientType.TopicType<Msg>
  ) {
    return <R>(
      behavior: RecipientBehaviour.RecipientBehaviour<Msg, R>,
      options?: RecipientBehaviour.EntityBehaviourOptions
    ): Effect.Effect<void, never, Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>> =>
      pipe(
        registerRecipient(topicType, behavior, options),
        Effect.zipRight(PubSub.publish(eventsHub, ShardingRegistrationEvent.TopicRegistered(topicType))),
        Effect.asVoid
      )
  }

  const getShardingRegistrationEvents: Stream.Stream<ShardingRegistrationEvent.ShardingRegistrationEvent> = Stream
    .fromPubSub(eventsHub)

  function registerRecipient<Msg extends Message.Message.Any, R>(
    recipientType: RecipientType.RecipientType<Msg>,
    behavior: RecipientBehaviour.RecipientBehaviour<Msg, R>,
    options?: RecipientBehaviour.EntityBehaviourOptions
  ) {
    return Effect.gen(function*() {
      const entityManager = yield* EntityManager.make(
        recipientType,
        behavior,
        self,
        config,
        serialization,
        options
      )

      yield* Ref.update(entityManagers, HashMap.set(recipientType.name, entityManager as any))
    })
  }

  const registerScoped = Effect.acquireRelease(register, (_) => unregister)

  const self: Sharding.Sharding = {
    [ShardingTypeId]: ShardingTypeId,
    getShardId,
    register,
    unregister,
    registerScoped,
    messenger,
    broadcaster,
    isEntityOnLocalShards,
    isShuttingDown,
    registerSingleton,
    registerEntity,
    registerTopic,
    assign,
    unassign,
    getShardingRegistrationEvents,
    getPods,
    getAssignedShardIds,
    refreshAssignments,
    sendMessageToLocalEntityManagerWithoutRetries
  }

  return self
}
/**
 * @internal
 */
export const live = Layer.scoped(
  shardingTag,
  Effect.gen(function*() {
    const config = yield* ShardingConfig.ShardingConfig
    const pods = yield* Pods.Pods
    const shardManager = yield* ShardManagerClient.ShardManagerClient
    const storage = yield* Storage.Storage
    const serialization = yield* Serialization.Serialization
    const shardsCache = yield* Ref.make(HashMap.empty<ShardId.ShardId, PodAddress.PodAddress>())
    const entityManagers = yield* Ref.make(HashMap.empty<string, EntityManager.EntityManager>())
    const shuttingDown = yield* Ref.make(false)
    const eventsHub = yield* PubSub.unbounded<ShardingRegistrationEvent.ShardingRegistrationEvent>()
    const singletons = yield* Synchronized.make<List.List<SingletonEntry>>(List.nil())
    const layerScope = yield* Effect.scope
    const cdt = yield* Clock.currentTimeMillis
    const lastUnhealthyNodeReported = yield* Ref.make(cdt)
    yield* Effect.addFinalizer(() =>
      pipe(
        Synchronized.get(singletons),
        Effect.flatMap(
          Effect.forEach(([_, __, fa]) => Option.isSome(fa) ? Fiber.interrupt(fa.value) : Effect.void)
        )
      )
    )

    const sharding = make(
      layerScope,
      PodAddress.make(config.selfHost, config.shardingPort),
      config,
      shardsCache,
      entityManagers,
      singletons,
      lastUnhealthyNodeReported,
      shuttingDown,
      shardManager,
      pods,
      storage,
      serialization,
      eventsHub
    )

    yield* sharding.refreshAssignments

    return sharding
  })
)
