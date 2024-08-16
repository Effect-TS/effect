import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { identity } from "effect/Function"
import * as Iterable from "effect/Iterable"
import * as Layer from "effect/Layer"
import * as MutableHashMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { Entity } from "../Entity.js"
import { EntityAddress } from "../EntityAddress.js"
import { EntityId } from "../EntityId.js"
import type { EntityType } from "../EntityType.js"
import * as Envelope from "../Envelope.js"
import type { MailboxStorage } from "../MailboxStorage.js"
import type { Messenger } from "../Messenger.js"
import { PodAddress } from "../PodAddress.js"
import { ShardId } from "../ShardId.js"
import type * as Sharding from "../Sharding.js"
import type { ShardingConfig } from "../ShardingConfig.js"
import type { PodUnavailable } from "../ShardingException.js"
import { EntityNotManagedByPod, MalformedMessage } from "../ShardingException.js"
import type { ShardingRegistrationEvent } from "../ShardingRegistrationEvent.js"
import * as InternalEntityManager from "./entityManager.js"
import * as InternalPods from "./pods.js"
import * as InternalCircularSharding from "./sharding/circular.js"
import * as InternalShardingConfig from "./shardingConfig.js"
import { EntityRegistered } from "./shardingRegistrationEvent.js"
import * as InternalShardManagerClient from "./shardManagerClient.js"

interface EntityManagerState {
  readonly scope: Scope.CloseableScope
  readonly manager: InternalEntityManager.EntityManager
}

const make = Effect.gen(function*() {
  const config = yield* InternalShardingConfig.Tag
  const pods = yield* InternalPods.Tag
  const shardManager = yield* InternalShardManagerClient.Tag

  const shardingScope = yield* Effect.scope
  const isShutdown = yield* Ref.make(false)
  const context = yield* Effect.context<MailboxStorage | ShardingConfig>()
  const entityManagers = new Map<EntityType, EntityManagerState>()
  const shardAssignments = MutableHashMap.empty<ShardId, PodAddress>()
  const events = yield* PubSub.unbounded<ShardingRegistrationEvent>()
  const address = PodAddress.make({ host: config.host, port: config.port })

  const getPods = Effect.sync(() => Arr.dedupe(Iterable.map(shardAssignments, ([, pod]) => pod)))

  const getRegistrationEvents: Stream.Stream<ShardingRegistrationEvent> = Stream.fromPubSub(events)

  function getShardId(entityId: EntityId): ShardId {
    return ShardId.make(Math.abs(hashString(entityId) % config.numberOfShards))
  }

  function isEntityOnLocalShards(address: EntityAddress): Effect.Effect<boolean> {
    return Effect.sync(() => {
      const maybeAddress = MutableHashMap.get(shardAssignments, getShardId(address.entityId))
      return Equal.equals(maybeAddress, Option.some(address))
    })
  }

  const registerEntity: <Msg extends Envelope.Envelope.AnyMessage>(
    entity: Entity<Msg>,
    behavior: Entity.Behavior<Msg>,
    options?: Sharding.Sharding.RegistrationOptions | undefined
  ) => Effect.Effect<
    void,
    never,
    Schema.Serializable.Context<Msg>
  > = Effect.fnUntraced(function*(entity, behavior, options) {
    const scope = yield* Scope.fork(shardingScope, ExecutionStrategy.sequential)
    const manager = yield* InternalEntityManager.make(entity, behavior, options).pipe(
      Effect.provide(context.pipe(
        Context.add(InternalCircularSharding.Tag, sharding),
        Context.add(Scope.Scope, scope)
      ))
    )
    entityManagers.set(entity.type, { scope, manager })
    yield* Scope.addFinalizer(scope, Effect.sync(() => entityManagers.delete(entity.type)))
    yield* PubSub.publish(events, EntityRegistered(entity))
  })

  const sendToLocalEntityManager = (envelope: Envelope.Envelope.Encoded): Effect.Effect<
    void,
    EntityNotManagedByPod | MalformedMessage
  > =>
    Effect.suspend(() => {
      const address = Schema.decodeSync(EntityAddress)(envelope.address)
      if (!isEntityOnLocalShards(address)) {
        return Effect.fail(new EntityNotManagedByPod({ address }))
      }
      const state = entityManagers.get(address.entityType)
      if (!state) {
        return Effect.fail(new EntityNotManagedByPod({ address }))
      }
      return state.manager.send(envelope)
    })

  // TODO: notify shard manager if pod is unhealthy
  function sendToRemoteEntityManager(
    pod: PodAddress,
    envelope: Envelope.Envelope.Encoded
  ) {
    return pods.send(pod, envelope)
  }

  function sendEnvelope(pod: PodAddress, envelope: Envelope.Envelope.Encoded): Effect.Effect<
    void,
    EntityNotManagedByPod | MalformedMessage | PodUnavailable
  > {
    return Equal.equals(address, pod)
      ? sendToLocalEntityManager(envelope)
      : sendToRemoteEntityManager(pod, envelope)
  }

  function makeMessenger<Msg extends Envelope.Envelope.AnyMessage>(entity: Entity<Msg>): Effect.Effect<
    Messenger<Msg>,
    never,
    Schema.Serializable.Context<Msg>
  > {
    return Effect.contextWith((context) => {
      const sendVoid = Effect.fnUntraced(function*(entityIdentifier: string, message: Msg) {
        const entityId = EntityId.make(entityIdentifier)
        const shardId = getShardId(entityId)
        const address = new EntityAddress({ shardId, entityId, entityType: entity.type })
        const maybePod = MutableHashMap.get(shardAssignments, shardId)
        if (Option.isNone(maybePod)) {
          return yield* new EntityNotManagedByPod({ address })
        }
        const envelope = yield* Effect.mapError(
          Envelope.serialize(Envelope.make(address, message)),
          (cause) => new MalformedMessage({ cause })
        )
        yield* sendEnvelope(maybePod.value, envelope)
      }, Effect.provide(context))

      return identity<Messenger<Msg>>({ sendVoid })
    })
  }

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

  const sharding: Sharding.Sharding = {
    getPods,
    getRegistrationEvents,
    getShardId,
    isShutdown: Ref.get(isShutdown),
    makeMessenger,
    registerEntity,
    sendEnvelope
  }

  return sharding
})

/** @internal */
export const layer = Layer.scoped(InternalCircularSharding.Tag, make)

// Utilities

const hashOptimize = (n: number): number => (n & 0xbfffffff) | ((n >>> 1) & 0x40000000)

const hashString = (str: string) => {
  let h = 5381, i = str.length
  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i)
  }
  return hashOptimize(h)
}
