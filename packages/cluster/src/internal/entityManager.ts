import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Mailbox from "effect/Mailbox"
import * as Metric from "effect/Metric"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import type { Serializable } from "effect/Schema"
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

/** @internal */
export const make = <Msg extends Envelope.AnyMessage>(
  entity: Entity<Msg>,
  behavior: Entity.Behavior<Msg>,
  options?: Sharding.RegistrationOptions
): Effect.Effect<
  EntityManager,
  never,
  | Scope.Scope
  | Serializable.Context<Msg>
  | MailboxStorage
  | Sharding
  | ShardingConfig
> =>
  Effect.gen(function*() {
    const config = yield* InternalShardingConfig.Tag
    const sharding = yield* InternalShardingCircular.Tag
    const storage = yield* InternalMailboxStorage.Tag
    const runtime = yield* Effect.runtime<Serializable.Context<Msg>>()
    const gauge = InternalMetrics.entities.pipe(Metric.tagged("type", entity.type))

    // Represents the entities managed by this entity manager
    const entities: RcMap.RcMap<
      EntityAddress,
      Mailbox.Mailbox<MailboxStorage.Entry<Msg>>,
      EntityNotManagedByPod
    > = yield* RcMap.make({
      idleTimeToLive: options?.maxIdleTime ?? config.entityMaxIdleTime,
      lookup: Effect.fnUntraced(function*(address) {
        if (yield* sharding.isShutdown) {
          return yield* new EntityNotManagedByPod({ address })
        }
        const scope = yield* Effect.scope

        // Create the mailbox for the entity
        const mailbox = yield* Mailbox.make<MailboxStorage.Entry<Msg>>()

        // Initiate the behavior for the entity
        const fiber = yield* behavior(mailbox, makeReplier(address)).pipe(
          // ensure that the rcmap scope is not leaked to the behavior
          Effect.mapInputContext<Scope.Scope, never>(Context.omit(Scope.Scope)),
          Effect.ensuring(RcMap.invalidate(entities, address)),
          Effect.forkDaemon
        )

        // During shutdown, signal that no more messages will be processed
        // and wait for the fiber to complete.
        yield* Scope.addFinalizer(scope, Effect.andThen(mailbox.end, Fiber.await(fiber)))

        // Perform metric bookkeeping
        yield* Metric.increment(gauge)
        yield* Scope.addFinalizer(scope, Metric.incrementBy(gauge, BigInt(-1)))

        return mailbox
      })
    })

    // TODO: The replier could be used to also perform communication with the client?
    function makeReplier(address: EntityAddress): Entity.Replier {
      function complete<Msg extends Envelope.AnyMessage>(
        message: Msg,
        result: Exit.Exit<
          Schema.WithResult.Success<Msg>,
          Schema.WithResult.Failure<Msg>
        >
      ) {
        const state = InternalMessageState.processed(result)
        return storage.updateMessage(address, message, state).pipe(
          Effect.zipRight(RcMap.touch(entities, address))
        )
      }

      return {
        succeed: (message, value) => complete(message, Exit.succeed(value)),
        fail: (message, error) => complete(message, Exit.fail(error)),
        failCause: (message, cause) => complete(message, Exit.failCause(cause)),
        done: complete
      } as const
    }

    const decodeEnvelope = Schema.decodeUnknown(Schema.Struct({
      address: EntityAddress,
      message: entity.protocol
    }))

    function sendMessageToEntity(
      address: EntityAddress,
      entry: MailboxStorage.Entry<Msg>
    ): Effect.Effect<void, EntityNotManagedByPod> {
      return RcMap.get(entities, address).pipe(
        Effect.flatMap((mailbox) => mailbox.offer(entry)),
        Effect.scoped,
        Effect.catchAll(() => Effect.delay(sendMessageToEntity(address, entry), 100))
      )
    }

    const send: (
      envelope: Envelope.Encoded
    ) => Effect.Effect<void, EntityNotManagedByPod | MalformedMessage> = Effect.fnUntraced(
      function*(envelope) {
        const decodedEnvelope = yield* decodeEnvelope(envelope)
        const entry = yield* storage.saveMessage(decodedEnvelope.address, decodedEnvelope.message)
        yield* sendMessageToEntity(decodedEnvelope.address, entry)
      },
      Effect.catchTags({
        NoSuchElementException: () => Effect.void,
        ParseError: (cause) => new MalformedMessage({ cause }),
        // TODO: decide what to do on message persistence error
        MessagePersistenceError: () => Effect.void
      }),
      Effect.provide(runtime)
    )

    return {
      send
    } as const
  })
