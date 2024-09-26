import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as HashMap from "effect/HashMap"
import * as Metric from "effect/Metric"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"
import type { Entity } from "../Entity.js"
import { EntityAddress } from "../EntityAddress.js"
import type { Envelope } from "../Envelope.js"
import type { MailboxStorage } from "../MailboxStorage.js"
import type { Sharding } from "../Sharding.js"
import type { ShardingConfig } from "../ShardingConfig.js"
import { EntityNotManagedByPod, MalformedMessage } from "../ShardingException.js"
import * as InternalMailboxStorage from "./mailboxStorage.js"
import * as InternalMessageState from "./messageState.js"
import * as InternalMetrics from "./metrics.js"
import * as InternalShardingCircular from "./sharding/circular.js"
import * as InternalShardingConfig from "./shardingConfig.js"

/** @internal */
export interface EntityManager {
  readonly send: (envelope: Envelope.Encoded) => Effect.Effect<void, EntityNotManagedByPod | MalformedMessage>
}

interface EntityState<Msg extends Envelope.AnyMessage> {
  readonly mailbox: Queue.Queue<MailboxStorage.Entry<Msg>>
  readonly scope: Scope.CloseableScope
}

/** @internal */
export const make = <Msg extends Envelope.AnyMessage>(
  entity: Entity<Msg>,
  behavior: Entity.Behavior<Msg>,
  options?: Sharding.RegistrationOptions
): Effect.Effect<
  EntityManager,
  never,
  | Scope.Scope
  | Serializable.Serializable.Context<Msg>
  | MailboxStorage
  | Sharding
  | ShardingConfig
> =>
  Effect.gen(function*() {
    const config = yield* InternalShardingConfig.Tag
    const sharding = yield* InternalShardingCircular.Tag
    const storage = yield* InternalMailboxStorage.Tag
    const managerScope = yield* Effect.scope
    const runtime = yield* Effect.runtime<Serializable.Serializable.Context<Msg>>()
    const semaphore = yield* Effect.makeSemaphore(1)
    const gauge = InternalMetrics.entities.pipe(Metric.tagged("type", entity.type))

    // Represents the last time in milliseconds that an entity processed a message
    const lastActiveTimes = yield* Ref.make(
      HashMap.empty<EntityAddress, number>()
    )

    // Represents the entities managed by this entity manager
    const entities = yield* Ref.make(
      HashMap.empty<EntityAddress, EntityState<Msg>>()
    )

    // TODO: The replier could be used to also perform communication with the client?
    function makeReplier(address: EntityAddress): Entity.Replier {
      function complete<Msg extends Envelope.AnyMessage>(
        message: Msg,
        result: Exit.Exit<
          Serializable.WithResult.Success<Msg>,
          Serializable.WithResult.Failure<Msg>
        >
      ) {
        const state = InternalMessageState.processed(result)
        return storage.updateMessage(address, message, state).pipe(
          Effect.zipRight(Clock.currentTimeMillis),
          Effect.flatMap((now) => Ref.update(lastActiveTimes, HashMap.set(address, now)))
        )
      }

      return {
        succeed: (message, value) => complete(message, Exit.succeed(value)),
        fail: (message, error) => complete(message, Exit.fail(error)),
        failCause: (message, cause) => complete(message, Exit.failCause(cause)),
        complete,
        completeEffect: (message, effect) => Effect.exit(effect).pipe(Effect.flatMap((exit) => complete(message, exit)))
      } as const
    }

    function startExpirationFiber(address: EntityAddress, entityScope: Scope.Scope) {
      const maxIdleTime = Duration.toMillis(options?.maxIdleTime ?? config.entityMaxIdleTime)

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
            Effect.forkIn(managerScope)
          )
        ),
        Effect.forkIn(entityScope),
        Effect.interruptible
      )
    }

    function terminateEntity(address: EntityAddress) {
      return semaphore.withPermits(1)(
        Ref.get(entities).pipe(
          Effect.flatMap(HashMap.get(address)),
          Effect.flatMap((state) => Scope.close(state.scope, Exit.void)),
          Effect.catchTag("NoSuchElementException", () => Effect.void)
        )
      )
    }

    function getOrCreateState(address: EntityAddress) {
      return semaphore.withPermits(1)(
        Ref.get(entities).pipe(
          Effect.flatMap(HashMap.get(address)),
          Effect.catchTag("NoSuchElementException", () =>
            // If sharding is shutting down then no entities are managed by the pod
            new EntityNotManagedByPod({ address }).pipe(
              Effect.whenEffect(sharding.isShutdown),
              // Fork the scope for entity resources off the manager scope
              Effect.zipRight(Scope.fork(managerScope, ExecutionStrategy.sequential)),
              Effect.bindTo("scope"),
              // Start the entity expiration fiber based on the idle time-to-live
              Effect.tap(({ scope }) => startExpirationFiber(address, scope)),
              // Create the mailbox for the entity
              Effect.bind("mailbox", ({ scope }) =>
                Effect.tap(
                  Queue.unbounded<MailboxStorage.Entry<Msg>>(),
                  (mailbox) => Scope.addFinalizer(scope, mailbox.shutdown)
                )),
              // Initiate the behavior for the entity
              Effect.tap(({ mailbox, scope }) =>
                behavior(mailbox, makeReplier(address)).pipe(
                  Effect.ensuring(Scope.close(scope, Exit.void)),
                  Effect.forkIn(scope)
                )
              ),
              // Perform metric bookkeeping
              Effect.tap(({ scope }) =>
                Effect.zipRight(
                  Metric.increment(gauge),
                  Scope.addFinalizer(scope, Metric.incrementBy(gauge, BigInt(-1)))
                )
              ),
              // Ensure that the first finalizer run within the entity scope
              // is removal of the entity from the collection of managed entities
              Effect.tap(({ scope }) =>
                Scope.addFinalizer(
                  scope,
                  Ref.update(entities, HashMap.remove(address))
                )
              ),
              Effect.tap((state) => Ref.update(entities, HashMap.set(address, state)))
            ))
        )
      )
    }

    const decodeEnvelope = Schema.decodeUnknown(Schema.Struct({
      address: EntityAddress,
      message: entity.protocol
    }))

    function sendMessageToEntity(
      address: EntityAddress,
      entry: MailboxStorage.Entry<Msg>
    ): Effect.Effect<void, EntityNotManagedByPod> {
      return getOrCreateState(address).pipe(
        Effect.flatMap((state) =>
          state.mailbox.offer(entry).pipe(
            Effect.catchAllCause(() =>
              sendMessageToEntity(address, entry).pipe(
                Effect.delay("100 millis")
              )
            )
          )
        )
      )
    }

    function send(envelope: Envelope.Encoded): Effect.Effect<void, EntityNotManagedByPod | MalformedMessage> {
      return decodeEnvelope(envelope).pipe(
        Effect.bindTo("envelope"),
        Effect.bind("entry", ({ envelope }) => storage.saveMessage(envelope.address, envelope.message)),
        Effect.flatMap(({ entry, envelope }) => sendMessageToEntity(envelope.address, entry)),
        Effect.catchTags({
          NoSuchElementException: () => Effect.void,
          ParseError: (cause) => new MalformedMessage({ cause }),
          // TODO: decide what to do on message persistence error
          MessagePersistenceError: () => Effect.void
        }),
        Effect.provide(runtime)
      )
    }

    return {
      send
    } as const
  })
