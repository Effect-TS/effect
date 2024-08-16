/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Iterable from "effect/Iterable"
import * as Layer from "effect/Layer"
import * as MutableHashMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { Entity } from "./Entity.js"
import type { EntityAddress } from "./EntityAddress.js"
import type { EntityId } from "./EntityId.js"
import type { EntityType } from "./EntityType.js"
import type * as Envelope from "./Envelope.js"
import * as InternalEntityManager from "./internal/entityManager.js"
import { PodAddress } from "./PodAddress.js"
import { Pods } from "./Pods.js"
import { ShardId } from "./ShardId.js"
import { ShardingConfig } from "./ShardingConfig.js"
import type { MalformedMessage, PodUnavailable } from "./ShardingError.js"
import { EntityNotManagedByPod } from "./ShardingError.js"
import { EntityRegistered, type ShardingRegistrationEvent } from "./ShardingRegistrationEvent.js"
import { ShardManagerClient } from "./ShardManager.js"
import * as Snowflake from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category models
 */
export class Sharding extends Context.Tag("@effect/cluster/Sharding")<Sharding, {
  /**
   * The set of pods in the cluster.
   */
  readonly getPods: Effect.Effect<Array<PodAddress>>

  /**
   * Returns a stream of events that occur when the pod registers entities or
   * singletons.
   */
  readonly getRegistrationEvents: Stream.Stream<ShardingRegistrationEvent>

  /**
   * Returns the `ShardId` of the shard to which the entity at the specified
   * `address` is assigned.
   */
  readonly getShardId: (entityId: EntityId) => ShardId

  /**
   * Returns `true` if sharding is shutting down, `false` otherwise.
   */
  readonly isShutdown: Effect.Effect<boolean>

  // /**
  //  * Constructs a `Messenger` which can be used to send messages to the
  //  * specified `Entity`.
  //  */
  // readonly makeMessenger: <Msg extends Envelope.Envelope.AnyMessage>(
  //   entity: Entity<Msg>
  // ) => Effect.Effect<Messenger.Messenger<Msg>, never, Schema.SerializableWithResult.Context<Msg>>

  // /**
  //  * Registers the shard manager with the cluster.
  //  */
  // readonly register: Effect<void>
  // /**
  //  * Registers the shard manager with the cluster, and unregisters the shard
  //  * manager from the cluster when the provided scope is closed.
  //  */
  // readonly registerScoped: Effect<void, never, Scope>
  // /**
  //  * Unregisters the shard manager from the cluster.
  //  */
  // readonly unregister: Effect<void>

  /**
   * Registers a new entity with the pod.
   */
  readonly registerEntity: <Rpcs extends Rpc.Any>(
    entity: Entity<Rpcs>,
    options?: {
      readonly maxIdleTime?: DurationInput | undefined
    }
  ) => Effect.Effect<void, never, Rpc.Context<Rpcs> | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs>>
  // /**
  //  * Sends a message to the specified pod.
  //  */
  // readonly sendEnvelope: <Version extends string, Msg extends Envelope.AnyMessage>(
  //   pod: PodAddress,
  //   envelope: Envelope<Version, Msg>
  // ) => Effect<
  //   void,
  //   EntityNotManagedByPod | MalformedMessage | PodUnavailable
  // >
}>() {}

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

interface EntityManagerState {
  readonly scope: Scope.CloseableScope
  readonly manager: InternalEntityManager.EntityManager
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = Effect.gen(function*() {
  const config = yield* ShardingConfig
  const pods = yield* Pods
  const shardManager = yield* ShardManagerClient
  const snowflakeGen = yield* Snowflake.Generator
  const shardingScope = yield* Effect.scope
  const isShutdown = yield* Ref.make(false)
  const entityManagers = new Map<EntityType, EntityManagerState>()
  const shardAssignments = MutableHashMap.empty<ShardId, PodAddress>()
  const events = yield* PubSub.unbounded<ShardingRegistrationEvent>()
  const address = PodAddress.make({ host: config.host, port: config.port })

  const getPods = Effect.sync(() => Arr.dedupe(Iterable.map(shardAssignments, ([, pod]) => pod)))

  const getRegistrationEvents: Stream.Stream<ShardingRegistrationEvent> = Stream.fromPubSub(events)

  function getShardId(entityId: EntityId): ShardId {
    return ShardId.make(Math.abs(hashString(entityId) % config.numberOfShards))
  }

  function isEntityOnLocalShards(address: EntityAddress): boolean {
    const maybeAddress = MutableHashMap.get(shardAssignments, getShardId(address.entityId))
    return Equal.equals(maybeAddress, Option.some(address))
  }

  const context = yield* Effect.context<ShardingConfig>()
  const registerEntity: Sharding["Type"]["registerEntity"] = Effect.fnUntraced(
    function*(entity, options) {
      if (entityManagers.has(entity.type)) return
      const scope = yield* Scope.fork(shardingScope, ExecutionStrategy.sequential)
      const manager = yield* InternalEntityManager.make(entity, options).pipe(
        Effect.provide(context.pipe(
          Context.add(Sharding, sharding),
          Context.add(Scope.Scope, scope),
          Context.add(Snowflake.Generator, snowflakeGen)
        ))
      )
      entityManagers.set(entity.type, { scope, manager })

      // TODO: Send reply messages to the right pod
      // Add `sendReply` function

      yield* Scope.addFinalizer(scope, Effect.sync(() => entityManagers.delete(entity.type)))
      yield* PubSub.publish(events, EntityRegistered({ entity }))
    }
  )

  const sendEnvelopeLocal = (envelope: Envelope.EnvelopeWithContext<any>): Effect.Effect<
    void,
    EntityNotManagedByPod | MalformedMessage
  > =>
    Effect.suspend(() => {
      if (!isEntityOnLocalShards(envelope.address)) {
        return Effect.fail(new EntityNotManagedByPod({ address: envelope.address }))
      }
      const state = entityManagers.get(envelope.address.entityType)
      if (!state) {
        return Effect.fail(new EntityNotManagedByPod({ address: envelope.address }))
      }
      return pods.sendLocal({
        envelope,
        send: state.manager.send,
        simulateRemoteSerialization: config.simulateRemoteSerialization
      })
    })

  function sendEnvelope(
    pod: PodAddress,
    envelope: Envelope.EnvelopeWithContext<any>
  ): Effect.Effect<void, EntityNotManagedByPod | MalformedMessage | PodUnavailable> {
    return Equal.equals(address, pod)
      ? sendEnvelopeLocal(envelope)
      : pods.send(pod, envelope)
  }

  // function makeMessenger<Msg extends Envelope.Envelope.AnyMessage>(entity: Entity<Msg>): Effect.Effect<
  //   Messenger.Messenger<Msg>,
  //   never,
  //   Schema.SerializableWithResult.Context<Msg>
  // > {
  //   return Effect.contextWith((context) => {
  //     const send: Messenger.Messenger<Msg>["send"] = (entityIdentifier, message) =>
  //       Effect.suspend(() => {
  //         const entityId = EntityId.make(entityIdentifier)
  //         const shardId = getShardId(entityId)
  //         const address = new EntityAddress({ shardId, entityId, entityType: entity.type })
  //         const maybePod = MutableHashMap.get(shardAssignments, shardId)
  //         if (Option.isNone(maybePod)) {
  //           return Effect.fail(new EntityNotManagedByPod({ address }))
  //         }
  //         const envelope = Envelope.makeWithContext({
  //           id: snowflakeGen.unsafeNext(shardId),
  //           address,
  //           message,
  //           headers: Headers.empty,
  //           context
  //         })
  //         return Effect.flatten(Effect.orDie(sendEnvelope(maybePod.value, envelope)))
  //       })
  //
  //     return identity<Messenger.Messenger<Msg>>({
  //       [Messenger.TypeId]: Messenger.TypeId,
  //       send
  //     })
  //   })
  // }

  // Unregister pod from shard manager when scope is closed
  yield* Scope.addFinalizer(
    shardingScope,
    Effect.gen(function*() {
      yield* Effect.logDebug("Unregistering pod from shard manager", address)
      const unregisterFiber = yield* Effect.fork(Effect.catchAllCause(
        shardManager.unregister(address),
        (cause) => Effect.logError("Error calling unregister with shard manager", cause)
      ))

      yield* Effect.logDebug("Terminating local entities")
      yield* Ref.set(isShutdown, true)
      for (const [type, state] of entityManagers) {
        yield* Effect.catchAllCause(
          Scope.close(state.scope, Exit.void),
          (cause) => Effect.logError(`Error during termination of entity '${type}'`, cause)
        )
      }

      yield* Fiber.join(unregisterFiber)
    })
  )

  yield* Effect.logDebug("Registering pod with shard manager: ", address)
  yield* shardManager.register(address)

  const sharding = Sharding.of({
    getPods,
    getRegistrationEvents,
    getShardId,
    isShutdown: Ref.get(isShutdown),
    registerEntity
    // makeMessenger
  })

  return sharding
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<
  Sharding,
  never,
  ShardingConfig | Pods | ShardManagerClient
> = Layer.scoped(Sharding, make).pipe(
  Layer.provide(Snowflake.layerGenerator)
)

// Utilities

const hashOptimize = (n: number): number => (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)

const hashString = (str: string) => {
  let h = 5381, i = str.length
  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i)
  }
  return hashOptimize(h)
}
