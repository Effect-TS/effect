import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import * as RefSynchronized from "effect/SynchronizedRef"
import * as Message from "../Message.js"
import * as MessageState from "../MessageState.js"
import type * as RecipientAddress from "../RecipientAddress.js"
import type * as RecipientBehaviour from "../RecipientBehaviour.js"
import * as RecipientBehaviourContext from "../RecipientBehaviourContext.js"
import type * as RecipientType from "../RecipientType.js"
import type * as Serialization from "../Serialization.js"
import type * as SerializedEnvelope from "../SerializedEnvelope.js"
import type * as SerializedMessage from "../SerializedMessage.js"
import type * as ShardId from "../ShardId.js"
import type * as Sharding from "../Sharding.js"
import type * as ShardingConfig from "../ShardingConfig.js"
import * as ShardingException from "../ShardingException.js"
import * as EntityState from "./entityState.js"

/** @internal */
const EntityManagerSymbolKey = "@effect/cluster/EntityManager"

/** @internal */
export const EntityManagerTypeId = Symbol.for(
  EntityManagerSymbolKey
)

/** @internal */
export type EntityManagerTypeId = typeof EntityManagerTypeId

/** @internal */
export interface EntityManager {
  readonly [EntityManagerTypeId]: EntityManagerTypeId

  /** @internal */
  readonly sendAndGetState: (
    envelope: SerializedEnvelope.SerializedEnvelope
  ) => Effect.Effect<
    MessageState.MessageState<SerializedMessage.SerializedMessage>,
    | ShardingException.EntityNotManagedByThisPodException
    | ShardingException.PodUnavailableException
    | ShardingException.ExceptionWhileOfferingMessageException
    | ShardingException.SerializationException
  >

  /** @internal */
  readonly terminateEntitiesOnShards: (
    shards: HashSet.HashSet<ShardId.ShardId>
  ) => Effect.Effect<void>

  /** @internal */
  readonly terminateAllEntities: Effect.Effect<void>
}

/** @internal */
export function make<Msg extends Message.Message.Any, R>(
  recipientType: RecipientType.RecipientType<Msg>,
  recipientBehaviour: RecipientBehaviour.RecipientBehaviour<Msg, R>,
  sharding: Sharding.Sharding,
  config: ShardingConfig.ShardingConfig,
  serialization: Serialization.Serialization,
  options: RecipientBehaviour.EntityBehaviourOptions = {}
) {
  return Effect.gen(function*() {
    const entityMaxIdle = options.entityMaxIdleTime || Option.none()
    const env = yield* Effect.context<Exclude<R, RecipientBehaviourContext.RecipientBehaviourContext>>()
    const entityStates = yield* RefSynchronized.make<
      HashMap.HashMap<
        RecipientAddress.RecipientAddress,
        EntityState.EntityState
      >
    >(HashMap.empty())

    function startExpirationFiber(recipientAddress: RecipientAddress.RecipientAddress) {
      const maxIdleMillis = pipe(
        entityMaxIdle,
        Option.getOrElse(() => config.entityMaxIdleTime),
        Duration.toMillis
      )

      function sleep(duration: number): Effect.Effect<void> {
        return pipe(
          Effect.Do,
          Effect.zipLeft(Clock.sleep(Duration.millis(duration))),
          Effect.bind("cdt", () => Clock.currentTimeMillis),
          Effect.bind("map", () => RefSynchronized.get(entityStates)),
          Effect.let("lastReceivedAt", ({ map }) =>
            pipe(
              HashMap.get(map, recipientAddress),
              Option.map((_) => _.lastReceivedAt),
              Option.getOrElse(() => 0)
            )),
          Effect.let("remaining", ({ cdt, lastReceivedAt }) => (maxIdleMillis - cdt + lastReceivedAt)),
          Effect.tap((_) => _.remaining > 0 ? sleep(_.remaining) : Effect.void)
        )
      }

      return pipe(
        sleep(maxIdleMillis),
        Effect.zipRight(forkEntityTermination(recipientAddress)),
        Effect.asVoid,
        Effect.interruptible,
        Effect.annotateLogs("entityId", recipientAddress),
        Effect.annotateLogs("recipientType", recipientType.name),
        Effect.forkDaemon
      )
    }

    /**
     * Performs proper termination of the entity, interrupting the expiration timer, closing the scope and failing pending replies
     */
    function terminateEntity(recipientAddress: RecipientAddress.RecipientAddress) {
      return pipe(
        // get the things to cleanup
        RefSynchronized.get(
          entityStates
        ),
        Effect.map(HashMap.get(recipientAddress)),
        Effect.flatMap(Option.match({
          // there is no entity state to cleanup
          onNone: () => Effect.void,
          // found it!
          onSome: (entityState) =>
            pipe(
              // interrupt the expiration timer
              Fiber.interrupt(entityState.expirationFiber),
              // close the scope of the entity,
              Effect.ensuring(Scope.close(entityState.executionScope, Exit.void)),
              // remove the entry from the map
              Effect.ensuring(RefSynchronized.update(entityStates, HashMap.remove(recipientAddress))),
              // log error if happens
              Effect.catchAllCause(Effect.logError),
              Effect.asVoid,
              Effect.annotateLogs("entityId", recipientAddress.entityId),
              Effect.annotateLogs("recipientType", recipientAddress.recipientTypeName)
            )
        }))
      )
    }

    /**
     * Begins entity termination (if needed) and return the fiber to wait for completed termination (if any)
     */
    function forkEntityTermination(
      recipientAddress: RecipientAddress.RecipientAddress
    ): Effect.Effect<Option.Option<Fiber.RuntimeFiber<void, never>>> {
      return RefSynchronized.modifyEffect(entityStates, (entityStatesMap) =>
        pipe(
          HashMap.get(entityStatesMap, recipientAddress),
          Option.match({
            // if no entry is found, the entity has succefully shut down
            onNone: () => Effect.succeed([Option.none(), entityStatesMap] as const),
            // there is an entry, so we should begin termination
            onSome: (entityState) =>
              pipe(
                entityState.terminationFiber,
                Option.match({
                  // termination has already begun, keep everything as-is
                  onSome: () => Effect.succeed([entityState.terminationFiber, entityStatesMap] as const),
                  // begin to terminate the queue
                  onNone: () =>
                    pipe(
                      terminateEntity(recipientAddress),
                      Effect.forkDaemon,
                      Effect.map((terminationFiber) =>
                        [
                          Option.some(terminationFiber),
                          HashMap.modify(
                            entityStatesMap,
                            recipientAddress,
                            EntityState.withTerminationFiber(terminationFiber)
                          )
                        ] as const
                      )
                    )
                })
              )
          })
        ))
    }

    function getOrCreateEntityState(
      recipientAddress: RecipientAddress.RecipientAddress
    ): Effect.Effect<
      Option.Option<EntityState.EntityState>,
      ShardingException.EntityNotManagedByThisPodException
    > {
      return RefSynchronized.modifyEffect(entityStates, (map) =>
        pipe(
          HashMap.get(map, recipientAddress),
          Option.match({
            onSome: (entityState) =>
              pipe(
                entityState.terminationFiber,
                Option.match({
                  // offer exists, delay the interruption fiber and return the offer
                  onNone: () =>
                    pipe(
                      Clock.currentTimeMillis,
                      Effect.map(
                        (cdt) =>
                          [
                            Option.some(entityState),
                            HashMap.modify(map, recipientAddress, EntityState.withLastReceivedAd(cdt))
                          ] as const
                      )
                    ),
                  // the queue is shutting down, stash and retry
                  onSome: () => Effect.succeed([Option.none(), map] as const)
                })
              ),
            onNone: () =>
              Effect.flatMap(sharding.isShuttingDown, (isGoingDown) => {
                if (isGoingDown) {
                  // don't start any fiber while sharding is shutting down
                  return Effect.fail(new ShardingException.EntityNotManagedByThisPodException({ recipientAddress }))
                } else {
                  // offer doesn't exist, create a new one
                  return Effect.gen(function*() {
                    const executionScope = yield* Scope.make()
                    const expirationFiber = yield* startExpirationFiber(recipientAddress)
                    const cdt = yield* Clock.currentTimeMillis
                    const forkShutdown = pipe(forkEntityTermination(recipientAddress), Effect.asVoid)
                    const shardId = sharding.getShardId(recipientAddress)

                    const sendAndGetState = yield* pipe(
                      recipientBehaviour,
                      Effect.map((offer) => (envelope: SerializedEnvelope.SerializedEnvelope) =>
                        pipe(
                          serialization.decode(recipientType.schema, envelope.body),
                          Effect.flatMap((message) =>
                            pipe(
                              offer(message),
                              Effect.flatMap((_) =>
                                MessageState.mapEffect(
                                  _,
                                  (value) => serialization.encode(Message.exitSchema(message), value)
                                )
                              )
                            )
                          )
                        )
                      ),
                      Scope.extend(executionScope),
                      Effect.provideService(
                        RecipientBehaviourContext.RecipientBehaviourContext,
                        RecipientBehaviourContext.make({
                          recipientAddress,
                          shardId,
                          recipientType: recipientType as any,
                          forkShutdown
                        })
                      ),
                      Effect.provide(env)
                    )

                    const entityState = EntityState.make({
                      sendAndGetState,
                      expirationFiber,
                      executionScope,
                      terminationFiber: Option.none(),
                      lastReceivedAt: cdt
                    })

                    return [
                      Option.some(entityState),
                      HashMap.set(
                        map,
                        recipientAddress,
                        entityState
                      )
                    ] as const
                  })
                }
              })
          })
        ))
    }

    function sendAndGetState(
      envelope: SerializedEnvelope.SerializedEnvelope
    ): Effect.Effect<
      MessageState.MessageState<SerializedMessage.SerializedMessage>,
      | ShardingException.EntityNotManagedByThisPodException
      | ShardingException.PodUnavailableException
      | ShardingException.ExceptionWhileOfferingMessageException
      | ShardingException.SerializationException
    > {
      return pipe(
        Effect.Do,
        Effect.tap(() => {
          // first, verify that this entity should be handled by this pod
          if (recipientType._tag === "EntityType") {
            return Effect.asVoid(Effect.unlessEffect(
              Effect.fail(
                new ShardingException.EntityNotManagedByThisPodException({
                  recipientAddress: envelope.recipientAddress
                })
              ),
              sharding.isEntityOnLocalShards(envelope.recipientAddress)
            ))
          } else if (recipientType._tag === "TopicType") {
            return Effect.void
          }
          return Effect.die("Unhandled recipientType")
        }),
        Effect.bind("maybeEntityState", () => getOrCreateEntityState(envelope.recipientAddress)),
        Effect.flatMap((_) =>
          pipe(
            _.maybeEntityState,
            Option.match({
              onNone: () =>
                pipe(
                  Effect.sleep(Duration.millis(100)),
                  Effect.flatMap(() => sendAndGetState(envelope))
                ),
              onSome: (entityState) => {
                return entityState.sendAndGetState(envelope)
              }
            })
          )
        )
      )
    }

    const terminateAllEntities = pipe(
      RefSynchronized.get(entityStates),
      Effect.map(HashMap.keySet),
      Effect.flatMap(terminateEntities)
    )

    function terminateEntities(
      entitiesToTerminate: HashSet.HashSet<
        RecipientAddress.RecipientAddress
      >
    ) {
      return pipe(
        entitiesToTerminate,
        Effect.forEach(
          (recipientAddress) =>
            pipe(
              forkEntityTermination(recipientAddress),
              Effect.flatMap((_) =>
                Option.match(_, {
                  onNone: () => Effect.void,
                  onSome: (terminationFiber) =>
                    pipe(
                      Fiber.await(terminationFiber),
                      Effect.timeout(config.entityTerminationTimeout),
                      Effect.match({
                        onFailure: () =>
                          Effect.logError(
                            `Entity ${recipientAddress} termination is taking more than expected entityTerminationTimeout (${
                              Duration.toMillis(config.entityTerminationTimeout)
                            }ms).`
                          ),
                        onSuccess: () =>
                          Effect.logDebug(
                            `Entity ${recipientAddress} cleaned up.`
                          )
                      }),
                      Effect.asVoid
                    )
                })
              )
            ),
          { concurrency: "inherit" }
        ),
        Effect.asVoid
      )
    }

    function terminateEntitiesOnShards(shards: HashSet.HashSet<ShardId.ShardId>) {
      return pipe(
        RefSynchronized.modify(entityStates, (entities) => [
          HashMap.filter(
            entities,
            (_, recipientAddress) => HashSet.has(shards, sharding.getShardId(recipientAddress))
          ),
          entities
        ]),
        Effect.map(HashMap.keySet),
        Effect.flatMap(terminateEntities)
      )
    }

    const self: EntityManager = {
      [EntityManagerTypeId]: EntityManagerTypeId,
      sendAndGetState,
      terminateAllEntities,
      terminateEntitiesOnShards
    }
    return self
  })
}
