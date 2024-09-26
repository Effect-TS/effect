import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Clock from "effect/Clock"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Mailbox from "effect/Mailbox"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import type * as Request from "effect/Request"
import * as Scope from "effect/Scope"
import * as SynchronizedRef from "effect/SynchronizedRef"
import type * as Entity from "../Entity.js"
import { EntityAddress } from "../EntityAddress.js"
import type { Envelope } from "../Envelope.js"
import { MailboxStorage } from "../MailboxStorage.js"
import type { ShardId } from "../ShardId.js"
import type { Sharding } from "../Sharding.js"
import { ShardingConfig } from "../ShardingConfig.js"
import { EntityNotManagedByPod, MalformedMessage } from "../ShardingException.js"
import * as InternalMetrics from "./metrics.js"
import * as InternalCircularSharding from "./sharding/circular.js"

/** @internal */
export interface EntityManager {
  readonly send: (envelope: Envelope.Encoded) => Effect.Effect<void, EntityNotManagedByPod | MalformedMessage>
  readonly terminateEntity: (address: EntityAddress) => Effect.Effect<void>
  readonly terminateAllEntities: Effect.Effect<void>
  readonly terminateEntitiesOnShards: (shards: HashSet.HashSet<ShardId>) => Effect.Effect<void>
}

type EntityState<Msg extends Envelope.AnyMessage> = Active<Msg> | Terminating

interface Active<Msg extends Envelope.AnyMessage> {
  readonly _tag: "Active"
  readonly mailbox: Mailbox.Mailbox<Msg>
  readonly scope: Scope.CloseableScope
}

interface Terminating {
  readonly _tag: "Terminating"
}

/** @internal */
export const make = <Msg extends Envelope.AnyMessage>(
  entity: Entity.Entity<Msg>,
  behavior: (address: EntityAddress, mailbox: Mailbox.ReadonlyMailbox<Msg>) => Effect.Effect<never>,
  options: Sharding.RegistrationOptions
): Effect.Effect<
  EntityManager,
  never,
  Scope.Scope | Serializable.Serializable.Context<Msg> | MailboxStorage | Sharding | ShardingConfig
> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<Serializable.Serializable.Context<Msg>>()
    const sharding = yield* InternalCircularSharding.Tag
    const storage = yield* MailboxStorage
    const config = yield* ShardingConfig
    const managerScope = yield* Effect.scope

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

    function startExpirationFiber(address: EntityAddress, entityScope: Scope.Scope) {
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
            Effect.forkIn(managerScope),
            Effect.asVoid
          )
        ),
        Effect.asVoid,
        Effect.interruptible,
        Effect.forkIn(entityScope)
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

    function processMessage(message: Msg, result: Request.Request.Result<Msg>) {
      // TODO:
      //   - Update the database marking the message as processed with its result
      //   - Communicate the result back to the client
      //   - Mark the last message processed time for the receiving entity
    }

    function getOrCreateState(address: EntityAddress) {
      return SynchronizedRef.modifyEffect(entities, (map) => {
        return Option.match(HashMap.get(map, address), {
          onNone: () =>
            new EntityNotManagedByPod({ address }).pipe(
              Effect.whenEffect(sharding.isShutdown),
              Effect.zipRight(Scope.fork(managerScope, ExecutionStrategy.sequential)),
              Effect.bindTo("scope"),
              Effect.tap(({ scope }) => startExpirationFiber(address, scope)),
              Effect.bind("mailbox", ({ scope }) =>
                Effect.tap(
                  Mailbox.make<Msg>(),
                  (mailbox) => Scope.addFinalizer(scope, mailbox.shutdown)
                )),
              Effect.tap(({ mailbox, scope }) =>
                behavior(address, mailbox).pipe(
                  Effect.ensuring(Scope.close(scope, Exit.void)),
                  Effect.forkIn(scope)
                )
              ),
              // TODO: update last active based upon last message _processed_ not last message _received_
              // Effect.ensuring(Ref.update(lastActiveTimes, HashMap.remove(address))),
              Effect.tap(({ scope }) =>
                Effect.zipLeft(
                  Metric.increment(gauge),
                  Scope.addFinalizer(scope, Metric.incrementBy(gauge, BigInt(-1)))
                )
              ),
              Effect.tap(({ scope }) =>
                Scope.addFinalizer(scope, SynchronizedRef.update(entities, HashMap.remove(address)))
              ),
              Effect.map(({ mailbox, scope }) => {
                const state: EntityState<Msg> = { _tag: "Active", mailbox, scope }
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
      return getOrCreateState(address).pipe(
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
                return state.mailbox.shutdown.pipe(
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
