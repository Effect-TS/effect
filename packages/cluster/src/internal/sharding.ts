import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Runtime from "effect/Runtime"
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
  const runtime = yield* Effect.runtime<MailboxStorage | ShardingConfig>()
  const entityManagers = yield* Ref.make(HashMap.empty<EntityType, EntityManagerState>())
  const shardAssignments = yield* Ref.make(HashMap.empty<ShardId, PodAddress>())
  const events = yield* PubSub.unbounded<ShardingRegistrationEvent>()
  const address = PodAddress.make({ host: config.host, port: config.port })

  const register = Effect.logDebug("Registering pod with shard manager: ", address).pipe(
    Effect.zipRight(Ref.set(isShutdown, false)),
    Effect.zipRight(shardManager.register(address))
  )

  const unregister = shardManager.getAssignments.pipe(
    Effect.matchCauseEffect({
      onFailure: (cause) =>
        Effect.logWarning(
          "ShardManager not available - cannot unregister pod cleanly: ",
          cause
        ),
      onSuccess: () =>
        Effect.logDebug("Terminating local entities").pipe(
          Effect.zipRight(Ref.set(isShutdown, true)),
          Effect.zipRight(Ref.get(entityManagers)),
          Effect.flatMap(Effect.forEach(([type, state]) =>
            // TODO: fork entity termination?
            Effect.catchAllCause(
              Scope.close(state.scope, Exit.void),
              (cause) => Effect.logError(`Error during termination of entity '${type}'`, cause)
            )
          )),
          Effect.zipRight(Effect.logDebug("Unregistering pod from shard manager", address)),
          Effect.zipRight(
            Effect.catchAllCause(
              shardManager.unregister(address),
              (cause) => Effect.logError("Error during pod unregister", cause)
            )
          )
        )
    })
  )

  const registerScoped = Effect.acquireRelease(register, () => unregister)

  const getPods = Ref.get(shardAssignments).pipe(
    Effect.map((shards) => HashSet.fromIterable(HashMap.values(shards)))
  )

  const getRegistrationEvents: Stream.Stream<ShardingRegistrationEvent> = Stream.fromPubSub(events)

  function getShardId(entityId: EntityId): ShardId {
    return ShardId.make(Math.abs(hashString(entityId) % config.numberOfShards))
  }

  function isEntityOnLocalShards(address: EntityAddress): Effect.Effect<boolean> {
    return Ref.get(shardAssignments).pipe(Effect.map((shards) => {
      const shardId = getShardId(address.entityId)
      const maybeAddress = HashMap.get(shards, shardId)
      return Equal.equals(maybeAddress, Option.some(address))
    }))
  }

  function registerEntity<Msg extends Envelope.Envelope.AnyMessage>(
    entity: Entity<Msg>,
    behavior: Entity.Behavior<Msg>,
    options?: Sharding.Sharding.RegistrationOptions
  ): Effect.Effect<void, never, Serializable.Serializable.Context<Msg>> {
    return Scope.fork(shardingScope, ExecutionStrategy.sequential).pipe(
      Effect.bindTo("scope"),
      Effect.bind("manager", ({ scope }) =>
        InternalEntityManager.make(entity, behavior, options).pipe(
          Effect.provide(runtime.pipe(
            Runtime.provideService(InternalCircularSharding.Tag, sharding),
            Runtime.provideService(Scope.Scope, scope)
          ))
        )),
      Effect.flatMap((state) => Ref.update(entityManagers, HashMap.set(entity.type, state))),
      Effect.zipRight(PubSub.publish(events, EntityRegistered(entity))),
      Effect.asVoid
    )
  }

  function sendToLocalEntityManager(
    envelope: Envelope.Envelope.Encoded
  ): Effect.Effect<void, EntityNotManagedByPod | MalformedMessage> {
    const address = Schema.validateSync(EntityAddress)(envelope.address)
    return new EntityNotManagedByPod({ address }).pipe(
      Effect.unlessEffect(isEntityOnLocalShards(address)),
      Effect.zipRight(Ref.get(entityManagers)),
      Effect.flatMap(HashMap.get(address)),
      Effect.flatMap((state) => state.manager.send(envelope)),
      Effect.catchTag("NoSuchElementException", () => new EntityNotManagedByPod({ address }))
    )
  }

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
    Serializable.Serializable.Context<Msg>
  > {
    return Effect.gen(function*() {
      const runtime = yield* Effect.runtime<Serializable.Serializable.Context<Msg>>()

      function sendMessage(entityIdentifier: string, message: Msg) {
        const entityId = EntityId.make(entityIdentifier)
        const shardId = getShardId(entityId)
        const address = new EntityAddress({ shardId, entityId, entityType: entity.type })
        return Ref.get(shardAssignments).pipe(
          Effect.flatMap(HashMap.get(shardId)),
          Effect.bindTo("pod"),
          Effect.bind("envelope", () => Envelope.serialize(Envelope.make(address, message))),
          Effect.catchTags({
            NoSuchElementException: () => new EntityNotManagedByPod({ address }),
            ParseError: (cause) => new MalformedMessage({ cause })
          }),
          Effect.flatMap(({ envelope, pod }) => sendEnvelope(pod, envelope)),
          Effect.provide(runtime)
        )
      }

      return { sendMessage } as any
    })
  }

  const sharding: Sharding.Sharding = {
    getPods,
    getRegistrationEvents,
    getShardId,
    isShutdown: Ref.get(isShutdown),
    makeMessenger,
    register,
    registerScoped,
    unregister,
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
