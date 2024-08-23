import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import type { Entity } from "../Entity.js"
import { EntityAddress } from "../EntityAddress.js"
import { EntityId } from "../EntityId.js"
import type { EntityType } from "../EntityType.js"
import * as Envelope from "../Envelope.js"
import type { Mailbox } from "../Mailbox.js"
import type { MailboxStorage } from "../MailboxStorage.js"
import type { Messenger } from "../Messenger.js"
import { PodAddress } from "../PodAddress.js"
import type { Pods } from "../Pods.js"
import { ShardId } from "../ShardId.js"
import type * as Sharding from "../Sharding.js"
import type { ShardingConfig } from "../ShardingConfig.js"
import type { PodUnavailable } from "../ShardingException.js"
import { EntityNotManagedByPod, MalformedMessage } from "../ShardingException.js"
import type { ShardingRegistrationEvent } from "../ShardingRegistrationEvent.js"
import * as InternalEntityManager from "./entityManager.js"
import * as InternalMailboxStorage from "./mailboxStorage.js"
import * as InternalPods from "./pods.js"
import * as InternalCircularSharding from "./sharding/circular.js"
import * as InternalShardingConfig from "./shardingConfig.js"
import { EntityRegistered } from "./shardingRegistrationEvent.js"

const make = Effect.gen(function*() {
  const config = yield* InternalShardingConfig.Tag
  const pods = yield* InternalPods.Tag
  const storage = yield* InternalMailboxStorage.Tag

  const podAddress = PodAddress.make({ host: config.host, port: config.port })
  const shutdownRef = yield* Ref.make(false)
  const entityManagers = yield* Ref.make(HashMap.empty<EntityType, InternalEntityManager.EntityManager>())
  const shardAssignments = yield* Ref.make(HashMap.empty<ShardId, PodAddress>())
  const events = yield* PubSub.unbounded<ShardingRegistrationEvent>()

  const getPods: Effect.Effect<HashSet.HashSet<PodAddress>> = Ref.get(shardAssignments).pipe(
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
    behavior: (address: EntityAddress, mailbox: Mailbox<Msg>) => Effect.Effect<never>,
    options: Sharding.Sharding.RegistrationOptions
  ): Effect.Effect<void, never, Serializable.Serializable.Context<Msg>> {
    return InternalEntityManager.make(entity, behavior, options).pipe(
      Effect.flatMap((manager) => Ref.update(entityManagers, HashMap.set(entity.type, manager))),
      Effect.zipRight(PubSub.publish(events, EntityRegistered(entity))),
      Effect.provideService(InternalMailboxStorage.Tag, storage),
      Effect.provideService(InternalCircularSharding.Tag, sharding),
      Effect.provideService(InternalShardingConfig.Tag, config),
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
      Effect.flatMap((manager) => manager.send(envelope)),
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
    return Equal.equals(podAddress, pod)
      ? sendToLocalEntityManager(envelope)
      : sendToRemoteEntityManager(pod, envelope)
  }

  function makeMessenger<Msg extends Envelope.Envelope.AnyMessage>(entity: Entity<Msg>): Effect.Effect<
    Messenger<Msg>,
    never,
    Serializable.Serializable.Context<Msg>
  > {
    return Effect.gen(function*() {
      const context = yield* Effect.context<Serializable.Serializable.Context<Msg>>()

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
          Effect.provide(context)
        )
      }

      return { sendMessage } as any
    })
  }

  const sharding: Sharding.Sharding = {
    getPods,
    getRegistrationEvents,
    getShardId,
    isShutdown: Ref.get(shutdownRef),
    makeMessenger,
    registerEntity,
    sendEnvelope
  }

  return sharding
})

/** @internal */
export const layer: Layer.Layer<Sharding.Sharding, never, MailboxStorage | Pods | ShardingConfig> = Layer.effect(
  InternalCircularSharding.Tag,
  make
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
