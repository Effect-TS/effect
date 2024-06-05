/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as HashSet from "effect/HashSet"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type { Broadcaster } from "./Broadcaster.js"
import * as internal from "./internal/sharding.js"
import type * as Message from "./Message.js"
import type * as MessageState from "./MessageState.js"
import type { Messenger } from "./Messenger.js"
import type * as PodAddress from "./PodAddress.js"
import type * as RecipientAddress from "./RecipientAddress.js"
import type * as RecipientBehaviour from "./RecipientBehaviour.js"
import type * as RecipientBehaviourContext from "./RecipientBehaviourContext.js"
import type * as RecipentType from "./RecipientType.js"
import type * as SerializedEnvelope from "./SerializedEnvelope.js"
import type * as SerializedMessage from "./SerializedMessage.js"
import type * as ShardId from "./ShardId.js"
import type * as ShardingException from "./ShardingException.js"
import type * as ShardingRegistrationEvent from "./ShardingRegistrationEvent.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ShardingTypeId: unique symbol = internal.ShardingTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ShardingTypeId = typeof ShardingTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Sharding {
  readonly [ShardingTypeId]: ShardingTypeId
  readonly register: Effect.Effect<void>
  readonly unregister: Effect.Effect<void>
  readonly messenger: <Msg extends Message.Message.Any>(
    entityType: RecipentType.EntityType<Msg>
  ) => Messenger<Msg>
  readonly broadcaster: <Msg extends Message.Message.Any>(
    topicType: RecipentType.TopicType<Msg>
  ) => Broadcaster<Msg>
  readonly isEntityOnLocalShards: (
    recipientAddress: RecipientAddress.RecipientAddress
  ) => Effect.Effect<boolean>
  readonly isShuttingDown: Effect.Effect<boolean>

  readonly registerScoped: Effect.Effect<void, never, Scope.Scope>
  readonly registerEntity: <Msg extends Message.Message.Any>(
    entityType: RecipentType.EntityType<Msg>
  ) => <R>(
    behaviour: RecipientBehaviour.RecipientBehaviour<Msg, R>,
    options?: RecipientBehaviour.EntityBehaviourOptions
  ) => Effect.Effect<void, never, Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>>
  readonly registerTopic: <Msg extends Message.Message.Any>(
    topicType: RecipentType.TopicType<Msg>
  ) => <R>(
    behaviour: RecipientBehaviour.RecipientBehaviour<Msg, R>,
    options?: RecipientBehaviour.EntityBehaviourOptions
  ) => Effect.Effect<void, never, Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>>
  readonly getShardingRegistrationEvents: Stream.Stream<ShardingRegistrationEvent.ShardingRegistrationEvent>
  readonly registerSingleton: <R>(name: string, run: Effect.Effect<void, never, R>) => Effect.Effect<void, never, R>
  readonly assign: (shards: HashSet.HashSet<ShardId.ShardId>) => Effect.Effect<void>
  readonly unassign: (shards: HashSet.HashSet<ShardId.ShardId>) => Effect.Effect<void>
  readonly sendMessageToLocalEntityManagerWithoutRetries: (
    message: SerializedEnvelope.SerializedEnvelope
  ) => Effect.Effect<
    MessageState.MessageState<SerializedMessage.SerializedMessage>,
    ShardingException.ShardingException
  >
  readonly getPods: Effect.Effect<HashSet.HashSet<PodAddress.PodAddress>>
  readonly getAssignedShardIds: Effect.Effect<HashSet.HashSet<ShardId.ShardId>>
  /** @internal */
  readonly refreshAssignments: Effect.Effect<void, never, Scope.Scope>
  /** @internal */
  readonly getShardId: (recipientAddress: RecipientAddress.RecipientAddress) => ShardId.ShardId
}

/**
 * @since 1.0.0
 * @category context
 */
export const Tag = internal.shardingTag

/**
 * @since 1.0.0
 * @category layers
 */
export const live = internal.live

/**
 * Notify the shard manager that shards can now be assigned to this pod.
 *
 * @since 1.0.0
 * @category utils
 */
export const register: Effect.Effect<void, never, Sharding> = internal.register

/**
 * Notify the shard manager that shards must be unassigned from this pod.
 *
 * @since 1.0.0
 * @category utils
 */
export const unregister: Effect.Effect<void, never, Sharding> = internal.unregister

/**
 * Same as `register`, but will automatically call `unregister` when the `Scope` is terminated.
 *
 * @since 1.0.0
 * @category utils
 */
export const registerScoped: Effect.Effect<void, never, Scope.Scope | Sharding> = internal.registerScoped

/**
 * Start a computation that is guaranteed to run only on a single pod.
 * Each pod should call `registerSingleton` but only a single pod will actually run it at any given time.
 *
 * @since 1.0.0
 * @category utils
 */
export const registerSingleton: <R>(
  name: string,
  run: Effect.Effect<void, never, R>
) => Effect.Effect<void, never, Sharding | R> = internal.registerSingleton

/**
 * Register a new entity type, allowing pods to send messages to entities of this type.
 *
 * @since 1.0.0
 * @category utils
 */
export const registerEntity: <Msg extends Message.Message.Any>(
  entityType: RecipentType.EntityType<Msg>
) => <R>(
  behavior: RecipientBehaviour.RecipientBehaviour<Msg, R>,
  options?: RecipientBehaviour.EntityBehaviourOptions | undefined
) => Effect.Effect<void, never, Sharding | Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>> =
  internal.registerEntity

/**
 * Register a new topic type, allowing pods to broadcast messages to subscribers.
 *
 * @since 1.0.0
 * @category utils
 */
export const registerTopic: <Msg extends Message.Message.Any>(
  topicType: RecipentType.TopicType<Msg>
) => <R>(
  behavior: RecipientBehaviour.RecipientBehaviour<Msg, R>,
  options?: RecipientBehaviour.EntityBehaviourOptions | undefined
) => Effect.Effect<void, never, Sharding | Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>> =
  internal.registerTopic

/**
 * Get an object that allows sending messages to a given entity type.
 * You can provide a custom send timeout to override the one globally defined.
 *
 * @since 1.0.0
 * @category utils
 */
export const messenger: <Msg extends Message.Message.Any>(
  entityType: RecipentType.EntityType<Msg>
) => Effect.Effect<Messenger<Msg>, never, Sharding> = internal.messenger

/**
 * Get an object that allows broadcasting messages to a given topic type.
 * You can provide a custom send timeout to override the one globally defined.
 *
 * @since 1.0.0
 * @category utils
 */
export const broadcaster: <Msg extends Message.Message.Any>(
  topicType: RecipentType.TopicType<Msg>
) => Effect.Effect<Broadcaster<Msg>, never, Sharding> = internal.broadcaster

/**
 * Get the list of pods currently registered to the Shard Manager
 *
 * @since 1.0.0
 * @category utils
 */
export const getPods: Effect.Effect<HashSet.HashSet<PodAddress.PodAddress>, never, Sharding> = internal.getPods

/**
 * Sends a raw message to the local entity manager without performing reties.
 * Those are up to the caller.
 *
 * @since 1.0.0
 * @category utils
 */
export const sendMessageToLocalEntityManagerWithoutRetries: (
  message: SerializedEnvelope.SerializedEnvelope
) => Effect.Effect<
  MessageState.MessageState<SerializedMessage.SerializedMessage>,
  ShardingException.ShardingException,
  Sharding
> = internal.sendMessageToLocalEntityManagerWithoutRetries

/**
 * Gets the list of shardIds assigned to the current Pod
 *
 * @since 1.0.0
 * @category utils
 */
export const getAssignedShardIds: Effect.Effect<HashSet.HashSet<ShardId.ShardId>, never, Sharding> =
  internal.getAssignedShardIds
