import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Clock from "effect/Clock"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as SynchronizedRef from "effect/SynchronizedRef"
import type * as Entity from "../Entity.js"
import { EntityAddress } from "../EntityAddress.js"
import type { Envelope } from "../Envelope.js"
import type { Mailbox } from "../Mailbox.js"
import { MailboxStorage } from "../MailboxStorage.js"
import type { ShardId } from "../ShardId.js"
import type { Sharding } from "../Sharding.js"
import { ShardingConfig } from "../ShardingConfig.js"
import { EntityNotManagedByPod, MalformedMessage } from "../ShardingException.js"
import * as InternalMailbox from "./mailbox.js"
import * as InternalMetrics from "./metrics.js"
import * as InternalCircularSharding from "./sharding/circular.js"

/** @internal */
export interface EntityManager {
  readonly send: (envelope: Envelope.Encoded) => Effect.Effect<void, EntityNotManagedByPod | MalformedMessage>
  readonly terminateEntity: (address: EntityAddress) => Effect.Effect<void>
  readonly terminateAllEntities: Effect.Effect<void>
  readonly terminateEntitiesOnShards: (shards: HashSet.HashSet<ShardId>) => Effect.Effect<void>
}

type EntityState<Msg extends Envelope.AnyMessage> = Terminating | Active<Msg>

interface Terminating {
  readonly _tag: "Terminating"
  readonly signal: Deferred.Deferred<void>
}

interface Active<Msg extends Envelope.AnyMessage> {
  readonly _tag: "Active"
  readonly mailbox: Mailbox<Msg>
}

/** @internal */
export const make = <Msg extends Envelope.AnyMessage>(
  entity: Entity.Entity<Msg>,
  behavior: (address: EntityAddress, mailbox: Mailbox<Msg>) => Effect.Effect<never>,
  options: Sharding.RegistrationOptions
): Effect.Effect<
  EntityManager,
  never,
  Serializable.Serializable.Context<Msg> | MailboxStorage | Sharding | ShardingConfig
> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<Serializable.Serializable.Context<Msg>>()
    const sharding = yield* InternalCircularSharding.Tag
    const storage = yield* MailboxStorage
    const config = yield* ShardingConfig

    // const scope = yield* Effect.scope
    const gauge = InternalMetrics.entities.pipe(Metric.tagged("type", entity.type))

    // Represents the last time (in millis) that each entity received a message
    const lastActiveTimes = yield* Ref.make(
      HashMap.empty<EntityAddress, number>()
    )
    // Represents the entities managed by this entity manager
    const entities = yield* SynchronizedRef.make(
      HashMap.empty<EntityAddress, EntityState<Msg>>()
    )

    function startExpirationFiber(address: EntityAddress) {
      const maxIdleTime = Duration.toMillis(options.maxIdleTime ?? config.entityMaxIdleTime)

      function sleep(duration: Duration.DurationInput): Effect.Effect<void> {
        return Clock.sleep(duration).pipe(
          Effect.zipRight(Clock.currentTimeMillis),
          Effect.zip(Ref.get(lastActiveTimes)),
          Effect.flatMap(([now, map]) => {
            const lastActive = HashMap.get(map, address).pipe(
              Option.getOrElse(() => 0)
            )
            const elapsed = now - lastActive
            const remaining = maxIdleTime - elapsed
            return remaining > 0 ? sleep(remaining) : Effect.void
          })
        )
      }

      return sleep(maxIdleTime).pipe(
        Effect.zipRight(
          terminateEntity(address).pipe(
            Effect.forkDaemon,
            Effect.asVoid
          )
        ),
        Effect.asVoid,
        Effect.interruptible,
        Effect.forkDaemon
      )
    }

    function terminateEntities(entities: HashMap.HashMap<EntityAddress, EntityState<Msg>>): Effect.Effect<void> {
      return Effect.forEach(entities, ([, state]) => {
        switch (state._tag) {
          case "Active": {
            return Deferred.make<void>().pipe(
              Effect.tap((signal) =>
                Queue.shutdown(state.mailbox).pipe(
                  Effect.zipRight(Deferred.succeed(signal, void 0))
                )
              )
            )
          }
          case "Terminating": {
            return Effect.succeed(state.signal)
          }
        }
      }).pipe(
        Effect.flatMap((signals) =>
          Effect.forEach(signals, (signal) => Deferred.await(signal), { discard: true }).pipe(
            Effect.timeout(config.entityTerminationTimeout)
          )
        ),
        Effect.orDie
      )
    }

    function getOrCreateState(address: EntityAddress) {
      return SynchronizedRef.modifyEffect(entities, (map) => {
        return Option.match(HashMap.get(map, address), {
          onNone: () =>
            new EntityNotManagedByPod({ address }).pipe(
              Effect.whenEffect(sharding.isShutdown),
              Effect.zipRight(
                InternalMailbox.make<Msg>(address).pipe(
                  Effect.provideService(MailboxStorage, storage)
                )
              ),
              Effect.bindTo("mailbox"),
              Effect.bind("fiber", () => startExpirationFiber(address)),
              Effect.zipLeft(Metric.increment(gauge)),
              Effect.tap(({ fiber, mailbox }) =>
                behavior(address, mailbox).pipe(
                  Effect.ensuring(
                    SynchronizedRef.update(entities, HashMap.remove(address)).pipe(
                      Effect.zipRight(Metric.incrementBy(gauge, BigInt(-1))),
                      Effect.zipRight(Ref.update(lastActiveTimes, HashMap.remove(address))),
                      Effect.zipRight(Queue.shutdown(mailbox)),
                      Effect.zipRight(Fiber.interrupt(fiber))
                    )
                  ),
                  Effect.forkDaemon
                )
              ),
              Effect.map(({ mailbox }) => {
                const state: EntityState<Msg> = { _tag: "Active", mailbox }
                return [state, HashMap.set(map, address, state)] as const
              })
            ),
          onSome: (state) => Effect.succeed([state, map] as const)
        })
      })
    }

    const decodeEnvelope = Schema.decodeUnknown(Schema.Struct({
      address: EntityAddress,
      message: entity.schema
    }))
    function send(
      envelope: Envelope.Encoded
    ): Effect.Effect<void, EntityNotManagedByPod | MalformedMessage> {
      return decodeEnvelope(envelope).pipe(
        Effect.bindTo("envelope"),
        Effect.bind("entry", ({ envelope }) => storage.saveMessage(envelope.address, envelope.message)),
        Effect.flatMap(({ entry, envelope }) => sendMessageToEntity(envelope.address, entry)),
        Effect.catchTags({
          NoSuchElementException: () => Effect.void,
          ParseError: (cause) => new MalformedMessage({ cause })
        }),
        Effect.provide(context)
      )
    }

    function sendMessageToEntity(
      address: EntityAddress,
      entry: Mailbox.Entry<Msg>
    ): Effect.Effect<void, EntityNotManagedByPod> {
      return SynchronizedRef.get(entities).pipe(
        Effect.flatMap((map) =>
          Option.match(HashMap.get(map, address), {
            onNone: () => getOrCreateState(address),
            onSome: Effect.succeed
          })
        ),
        Effect.flatMap((state) => {
          switch (state._tag) {
            case "Active": {
              return Clock.currentTimeMillis.pipe(
                Effect.flatMap((now) => Ref.update(lastActiveTimes, HashMap.set(address, now))),
                Effect.zipRight(state.mailbox.offer(entry)),
                Effect.catchAllCause(() =>
                  Clock.sleep("100 millis").pipe(
                    Effect.zipRight(sendMessageToEntity(address, entry))
                  )
                )
              )
            }
            case "Terminating": {
              // The entity is terminating, try again later
              return Clock.sleep("100 millis").pipe(
                Effect.zipRight(sendMessageToEntity(address, entry))
              )
            }
          }
        })
      )
    }

    function terminateEntity(address: EntityAddress): Effect.Effect<void> {
      return SynchronizedRef.updateEffect(entities, (map) =>
        Option.match(HashMap.get(map, address), {
          onNone: () => Effect.succeed(map),
          onSome: (state) => {
            switch (state._tag) {
              case "Active": {
                return Queue.shutdown(state.mailbox).pipe(
                  Effect.as(HashMap.remove(map, address))
                )
              }
              case "Terminating": {
                return Effect.succeed(map)
              }
            }
          }
        }))
    }

    function terminateEntitiesOnShards(shards: HashSet.HashSet<ShardId>) {
      return SynchronizedRef.modify(entities, (entities) => {
        const running: Array<[EntityAddress, EntityState<Msg>]> = []
        const terminating: Array<[EntityAddress, EntityState<Msg>]> = []
        for (const entity of entities) {
          if (HashSet.has(shards, sharding.getShardId(entity[0].entityId))) {
            terminating.push(entity)
          } else {
            running.push(entity)
          }
        }
        return [HashMap.fromIterable(terminating), HashMap.fromIterable(running)]
      }).pipe(Effect.flatMap(terminateEntities))
    }

    const terminateAllEntities: Effect.Effect<void> = SynchronizedRef.getAndSet(
      entities,
      HashMap.empty()
    ).pipe(Effect.flatMap(terminateEntities))

    return {
      send,
      terminateEntity,
      terminateEntitiesOnShards,
      terminateAllEntities
    } as const
  })
