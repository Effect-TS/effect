/**
 * @since 1.0.0
 */
import type { Serializable } from "@effect/schema/Serializable"
import type { Tag } from "effect/Context"
import type { Duration } from "effect/Duration"
import type { Effect } from "effect/Effect"
import type { HashSet } from "effect/HashSet"
import type { Scope } from "effect/Scope"
import type { Stream } from "effect/Stream"
import type { Entity } from "./Entity.js"
import type { EntityId } from "./EntityId.js"
import type { Envelope } from "./Envelope.js"
import * as InternalCircularSharding from "./internal/sharding/circular.js"
import type { Messenger } from "./Messenger.js"
import type { PodAddress } from "./PodAddress.js"
import type { ShardId } from "./ShardId.js"
import type { EntityNotManagedByPod, MalformedMessage, PodUnavailable } from "./ShardingException.js"
import type { ShardingRegistrationEvent } from "./ShardingRegistrationEvent.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface Sharding {
  /**
   * The set of pods in the cluster.
   */
  readonly getPods: Effect<HashSet<PodAddress>>
  /**
   * Returns a stream of events that occur when the pod registers entities or
   * singletons.
   */
  readonly getRegistrationEvents: Stream<ShardingRegistrationEvent>
  /**
   * Returns the `ShardId` of the shard to which the entity at the specified
   * `address` is assigned.
   */
  readonly getShardId: (entityId: EntityId) => ShardId
  /**
   * Returns `true` if sharding is shutting down, `false` otherwise.
   */
  readonly isShutdown: Effect<boolean>
  /**
   * Constructs a `Messenger` which can be used to send messages to the
   * specified `Entity`.
   */
  readonly makeMessenger: <Msg extends Envelope.AnyMessage>(
    entity: Entity<Msg>
  ) => Effect<Messenger<Msg>, never, Serializable.Context<Msg>>
  /**
   * Registers the shard manager with the cluster.
   */
  readonly register: Effect<void>
  /**
   * Registers the shard manager with the cluster, and unregisters the shard
   * manager from the cluster when the provided scope is closed.
   */
  readonly registerScoped: Effect<void, never, Scope>
  /**
   * Unregisters the shard manager from the cluster.
   */
  readonly unregister: Effect<void>
  /**
   * Registers a new entity with the pod.
   */
  readonly registerEntity: <Msg extends Envelope.AnyMessage>(
    entity: Entity<Msg>,
    behavior: Entity.Behavior<Msg>,
    options?: Sharding.RegistrationOptions
  ) => Effect<void, never, Serializable.Context<Msg>>
  /**
   * Sends a message to the specified pod.
   */
  readonly sendEnvelope: (pod: PodAddress, envelope: Envelope.Encoded) => Effect<
    void,
    EntityNotManagedByPod | MalformedMessage | PodUnavailable
  >
}

/**
 * @since 1.0.0
 */
export declare namespace Sharding {
  /**
   * Represents options that can be passed during entity registration to
   * configure the behavior of sharding.
   *
   * @since 1.0.0
   * @category models
   */
  export interface RegistrationOptions {
    /**
     * The maximum duration of inactivity (i.e. without having received or
     * processed a message) after which an entity will be interrupted.
     */
    readonly maxIdleTime?: Duration
  }
}

/**
 * @since 1.0.0
 * @category context
 */
export const Sharding: Tag<Sharding, Sharding> = InternalCircularSharding.Tag
