/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import { type FromServer, RequestId } from "@effect/rpc/RpcMessage"
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Fiber from "effect/Fiber"
import * as FiberHandle from "effect/FiberHandle"
import * as FiberMap from "effect/FiberMap"
import * as FiberRef from "effect/FiberRef"
import { constant } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Iterable from "effect/Iterable"
import * as Layer from "effect/Layer"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableRef from "effect/MutableRef"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as PubSub from "effect/PubSub"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { AlreadyProcessingMessage, MailboxFull, PersistenceError } from "./ClusterError.js"
import { EntityNotManagedByRunner, RunnerUnavailable } from "./ClusterError.js"
import { Persisted } from "./ClusterSchema.js"
import type { CurrentAddress, Entity, HandlersFrom } from "./Entity.js"
import { EntityAddress } from "./EntityAddress.js"
import { EntityId } from "./EntityId.js"
import type { EntityType } from "./EntityType.js"
import * as Envelope from "./Envelope.js"
import * as EntityManager from "./internal/entityManager.js"
import { EntityReaper } from "./internal/entityReaper.js"
import { hashString } from "./internal/hash.js"
import { internalInterruptors } from "./internal/interruptors.js"
import { ResourceMap } from "./internal/resourceMap.js"
import * as Message from "./Message.js"
import * as MessageStorage from "./MessageStorage.js"
import * as Reply from "./Reply.js"
import type { RunnerAddress } from "./RunnerAddress.js"
import { Runners } from "./Runners.js"
import { ShardId } from "./ShardId.js"
import { ShardingConfig } from "./ShardingConfig.js"
import { EntityRegistered, type ShardingRegistrationEvent, SingletonRegistered } from "./ShardingRegistrationEvent.js"
import { ShardManagerClient } from "./ShardManager.js"
import { ShardStorage } from "./ShardStorage.js"
import { SingletonAddress } from "./SingletonAddress.js"
import * as Snowflake from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category models
 */
export class Sharding extends Context.Tag("@effect/cluster/Sharding")<Sharding, {
  /**
   * Returns a stream of events that occur when the runner registers entities or
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

  /**
   * Constructs a `RpcClient` which can be used to send messages to the
   * specified `Entity`.
   */
  readonly makeClient: <Rpcs extends Rpc.Any>(
    entity: Entity<Rpcs>
  ) => Effect.Effect<
    (entityId: string) => RpcClient.RpcClient<Rpcs, MailboxFull | AlreadyProcessingMessage | PersistenceError>
  >

  /**
   * Registers a new entity with the runner.
   */
  readonly registerEntity: <Rpcs extends Rpc.Any, Handlers extends HandlersFrom<Rpcs>, RX>(
    entity: Entity<Rpcs>,
    handlers: Effect.Effect<Handlers, never, RX>,
    options?: {
      readonly maxIdleTime?: DurationInput | undefined
      readonly concurrency?: number | "unbounded" | undefined
      readonly mailboxCapacity?: number | "unbounded" | undefined
    }
  ) => Effect.Effect<void, never, Rpc.Context<Rpcs> | Rpc.Middleware<Rpcs> | Exclude<RX, Scope.Scope | CurrentAddress>>

  /**
   * Registers a new singleton with the runner.
   */
  readonly registerSingleton: <E, R>(
    name: string,
    run: Effect.Effect<void, E, R>
  ) => Effect.Effect<void, never, Exclude<R, Scope.Scope>>

  /**
   * Sends a message to the specified entity.
   */
  readonly send: (message: Message.Incoming<any>) => Effect.Effect<
    void,
    EntityNotManagedByRunner | MailboxFull | AlreadyProcessingMessage
  >

  /**
   * Notify sharding that a message has been persisted to storage.
   */
  readonly notify: (message: Message.Incoming<any>) => Effect.Effect<
    void,
    EntityNotManagedByRunner
  >
}>() {}

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

interface EntityManagerState {
  readonly entity: Entity<any>
  readonly scope: Scope.CloseableScope
  readonly manager: EntityManager.EntityManager
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = Effect.gen(function*() {
  const config = yield* ShardingConfig

  const runners = yield* Runners
  const shardManager = yield* ShardManagerClient
  const snowflakeGen = yield* Snowflake.Generator
  const shardingScope = yield* Effect.scope
  const isShutdown = MutableRef.make(false)

  const storage = yield* MessageStorage.MessageStorage
  const storageEnabled = storage !== MessageStorage.noop
  const shardStorage = yield* ShardStorage

  const entityManagers = new Map<EntityType, EntityManagerState>()

  const shardAssignments = MutableHashMap.empty<ShardId, RunnerAddress>()
  const selfShards = new Set<ShardId>()

  // the active shards are the ones that we have acquired the lock for
  const acquiredShards = new Set<ShardId>()
  const activeShardsLatch = yield* Effect.makeLatch(false)

  const events = yield* PubSub.unbounded<ShardingRegistrationEvent>()
  const getRegistrationEvents: Stream.Stream<ShardingRegistrationEvent> = Stream.fromPubSub(events)

  const isLocalRunner = (address: RunnerAddress) =>
    Option.isSome(config.runnerAddress) && Equal.equals(address, config.runnerAddress.value)

  function getShardId(entityId: EntityId): ShardId {
    return ShardId.make((Math.abs(hashString(entityId) % config.numberOfShards)) + 1)
  }

  function isEntityOnLocalShards(address: EntityAddress): boolean {
    return acquiredShards.has(address.shardId)
  }

  // --- Shard acquisition ---

  if (Option.isSome(config.runnerAddress)) {
    const selfAddress = config.runnerAddress.value
    yield* Scope.addFinalizerExit(shardingScope, () => {
      // the locks expire over time, so if this fails we ignore it
      return Effect.ignore(shardStorage.releaseAll(selfAddress))
    })

    const releasingShards = new Set<ShardId>()
    yield* Effect.gen(function*() {
      while (true) {
        yield* activeShardsLatch.await

        // if a shard is no longer assigned to this runner, we release it
        for (const shardId of acquiredShards) {
          if (selfShards.has(shardId)) continue
          acquiredShards.delete(shardId)
          releasingShards.add(shardId)
        }
        // if a shard has been assigned to this runner, we acquire it
        const unacquiredShards = new Set<ShardId>()
        for (const shardId of selfShards) {
          if (acquiredShards.has(shardId) || releasingShards.has(shardId)) continue
          unacquiredShards.add(shardId)
        }

        if (releasingShards.size > 0) {
          yield* Effect.forkIn(syncSingletons, shardingScope)
          yield* releaseShards
        }

        if (unacquiredShards.size === 0) {
          yield* activeShardsLatch.close
          continue
        }

        const acquired = yield* shardStorage.acquire(selfAddress, unacquiredShards)
        for (const shardId of acquired) {
          acquiredShards.add(shardId)
        }
        if (acquired.length > 0) {
          yield* storageReadLatch.open
          yield* Effect.forkIn(syncSingletons, shardingScope)
        }
        yield* Effect.sleep(1000)
      }
    }).pipe(
      Effect.catchAllCause((cause) => Effect.logWarning("Could not acquire/release shards", cause)),
      Effect.repeat(Schedule.spaced(config.entityMessagePollInterval)),
      Effect.annotateLogs({
        package: "@effect/cluster",
        module: "Sharding",
        fiber: "Shard acquisition loop",
        runner: selfAddress
      }),
      Effect.interruptible,
      Effect.forkIn(shardingScope)
    )

    // refresh the shard locks every minute
    yield* Effect.suspend(() =>
      shardStorage.refresh(selfAddress, [
        ...acquiredShards,
        ...releasingShards
      ])
    ).pipe(
      Effect.flatMap((acquired) => {
        for (const shardId of acquiredShards) {
          if (!acquired.includes(shardId)) {
            acquiredShards.delete(shardId)
            releasingShards.add(shardId)
          }
        }
        return releasingShards.size > 0 ?
          Effect.andThen(
            Effect.forkIn(syncSingletons, shardingScope),
            releaseShards
          ) :
          Effect.void
      }),
      Effect.retry({
        times: 5,
        schedule: Schedule.spaced(250)
      }),
      Effect.catchAllCause((cause) =>
        Effect.logError("Could not refresh shard locks", cause).pipe(
          Effect.andThen(clearSelfShards)
        )
      ),
      Effect.delay("1 minute"),
      Effect.forever,
      Effect.interruptible,
      Effect.forkIn(shardingScope)
    )

    const releaseShardsLock = Effect.unsafeMakeSemaphore(1).withPermits(1)
    const releaseShards = releaseShardsLock(
      Effect.suspend(() =>
        Effect.forEach(
          releasingShards,
          (shardId) =>
            Effect.forEach(
              entityManagers.values(),
              (state) => state.manager.interruptShard(shardId),
              { concurrency: "unbounded", discard: true }
            ).pipe(
              Effect.andThen(shardStorage.release(selfAddress, shardId)),
              Effect.annotateLogs({
                runner: selfAddress
              }),
              Effect.andThen(() => {
                releasingShards.delete(shardId)
              })
            ),
          { concurrency: "unbounded", discard: true }
        )
      )
    )
  }

  const clearSelfShards = Effect.suspend(() => {
    selfShards.clear()
    return activeShardsLatch.open
  })

  // --- Singletons ---

  const singletons = new Map<ShardId, MutableHashMap.MutableHashMap<SingletonAddress, Effect.Effect<void>>>()
  const singletonFibers = yield* FiberMap.make<SingletonAddress>()
  const withSingletonLock = Effect.unsafeMakeSemaphore(1).withPermits(1)

  const registerSingleton: Sharding["Type"]["registerSingleton"] = Effect.fnUntraced(
    function*(name, run) {
      const address = new SingletonAddress({
        shardId: getShardId(EntityId.make(name)),
        name
      })

      let map = singletons.get(address.shardId)
      if (!map) {
        map = MutableHashMap.empty()
        singletons.set(address.shardId, map)
      }
      if (MutableHashMap.has(map, address)) {
        return yield* Effect.dieMessage(`Singleton '${name}' is already registered`)
      }

      const context = yield* Effect.context<never>()
      const wrappedRun = run.pipe(
        Effect.locally(FiberRef.currentLogAnnotations, HashMap.empty()),
        Effect.andThen(Effect.never),
        Effect.scoped,
        Effect.provide(context),
        Effect.orDie,
        Effect.interruptible
      ) as Effect.Effect<never>
      MutableHashMap.set(map, address, wrappedRun)

      yield* PubSub.publish(events, SingletonRegistered({ address }))

      // start if we are on the right shard
      if (acquiredShards.has(address.shardId)) {
        yield* Effect.logDebug("Starting singleton", address)
        yield* FiberMap.run(singletonFibers, address, wrappedRun)
      }
    },
    withSingletonLock
  )

  const syncSingletons = withSingletonLock(Effect.gen(function*() {
    for (const [shardId, map] of singletons) {
      for (const [address, run] of map) {
        const running = FiberMap.unsafeHas(singletonFibers, address)
        const shouldBeRunning = acquiredShards.has(shardId)
        if (running && !shouldBeRunning) {
          yield* Effect.logDebug("Stopping singleton", address)
          internalInterruptors.add(yield* Effect.fiberId)
          yield* FiberMap.remove(singletonFibers, address)
        } else if (!running && shouldBeRunning) {
          yield* Effect.logDebug("Starting singleton", address)
          yield* FiberMap.run(singletonFibers, address, run)
        }
      }
    }
  }))

  // --- Storage inbox ---

  const storageReadLatch = yield* Effect.makeLatch(true)
  const openStorageReadLatch = constant(storageReadLatch.open)

  const storageReadLock = Effect.unsafeMakeSemaphore(1)
  const withStorageReadLock = storageReadLock.withPermits(1)

  if (storageEnabled && Option.isSome(config.runnerAddress)) {
    const selfAddress = config.runnerAddress.value

    yield* Effect.gen(function*() {
      yield* Effect.logDebug("Starting")
      yield* Effect.addFinalizer(() => Effect.logDebug("Shutting down"))

      // keep track of the last sent request ids to avoid duplicates
      // we only keep the last 30 sets to avoid memory leaks
      const sentRequestIds = new Set<Snowflake.Snowflake>()
      const sentRequestIdSets = new Set<Set<Snowflake.Snowflake>>()

      while (true) {
        // wait for the next poll interval, or if we get notified of a change
        yield* storageReadLatch.await

        // if we get notified of a change, ensure we start a read immediately
        // next iteration
        storageReadLatch.unsafeClose()

        // the lock is used to ensure resuming entities have a garantee that no
        // more items are added to the unprocessed set while the semaphore is
        // acquired.
        yield* storageReadLock.take(1)

        const messages = yield* storage.unprocessedMessages(acquiredShards)
        const currentSentRequestIds = new Set<Snowflake.Snowflake>()
        sentRequestIdSets.add(currentSentRequestIds)

        const send = Effect.catchAllCause(
          Effect.suspend(() => {
            const message = messages[index]
            if (message._tag === "IncomingRequest") {
              if (sentRequestIds.has(message.envelope.requestId)) {
                return Effect.void
              }
              sentRequestIds.add(message.envelope.requestId)
              currentSentRequestIds.add(message.envelope.requestId)
            }
            const address = message.envelope.address
            const state = entityManagers.get(address.entityType)
            if (!state || !acquiredShards.has(address.shardId)) {
              return Effect.void
            }

            const isProcessing = state.manager.isProcessingFor(message)

            // If the message might affect a currently processing request, we
            // send it to the entity manager to be processed.
            if (message._tag === "IncomingEnvelope" && isProcessing) {
              return state.manager.send(message)
            } else if (isProcessing) {
              return Effect.void
            }

            // If the entity was resuming in another fiber, we add the message
            // id to the unprocessed set.
            const resumptionState = MutableHashMap.get(entityResumptionState, address)
            if (Option.isSome(resumptionState)) {
              resumptionState.value.unprocessed.add(message.envelope.requestId)
              if (message.envelope._tag === "Interrupt") {
                resumptionState.value.interrupts.set(message.envelope.requestId, message as Message.IncomingEnvelope)
              }
              return Effect.void
            }
            return state.manager.send(message)
          }),
          (cause) => {
            const message = messages[index]
            const error = Cause.failureOption(cause)
            // if we get a defect, then update storage
            if (Option.isNone(error)) {
              return storage.saveReply(Reply.ReplyWithContext.fromDefect({
                id: snowflakeGen.unsafeNext(),
                requestId: message.envelope.requestId,
                defect: Cause.squash(cause)
              }))
            }
            if (error.value._tag === "MailboxFull") {
              // MailboxFull can only happen for requests, so this cast is safe
              return resumeEntityFromStorage(message as Message.IncomingRequest<any>)
            }
            return Effect.void
          }
        )

        let index = 0
        yield* Effect.whileLoop({
          while: () => index < messages.length,
          step: () => index++,
          body: constant(send)
        })

        // let the resuming entities check if they are done
        yield* storageReadLock.release(1)

        while (sentRequestIdSets.size > 30) {
          const oldest = Iterable.unsafeHead(sentRequestIdSets)
          sentRequestIdSets.delete(oldest)
          for (const id of oldest) {
            sentRequestIds.delete(id)
          }
        }
      }
    }).pipe(
      Effect.scoped,
      Effect.ensuring(storageReadLock.releaseAll),
      Effect.catchAllCause((cause) => Effect.logWarning("Could not read messages from storage", cause)),
      Effect.repeat(Schedule.spaced(config.entityMessagePollInterval)),
      Effect.annotateLogs({
        package: "@effect/cluster",
        module: "Sharding",
        fiber: "Storage read loop",
        runner: selfAddress
      }),
      Effect.interruptible,
      Effect.forkIn(shardingScope)
    )

    // open the storage latch every poll interval
    yield* storageReadLatch.open.pipe(
      Effect.delay(config.entityMessagePollInterval),
      Effect.forever,
      Effect.interruptible,
      Effect.forkIn(shardingScope)
    )

    // Resume unprocessed messages for entities that reached a full mailbox.
    const entityResumptionState = MutableHashMap.empty<EntityAddress, {
      unprocessed: Set<Snowflake.Snowflake>
      interrupts: Map<Snowflake.Snowflake, Message.IncomingEnvelope>
    }>()
    const resumeEntityFromStorage = (lastReceivedMessage: Message.IncomingRequest<any>) => {
      const address = lastReceivedMessage.envelope.address
      const resumptionState = MutableHashMap.get(entityResumptionState, address)
      if (Option.isSome(resumptionState)) {
        resumptionState.value.unprocessed.add(lastReceivedMessage.envelope.requestId)
        return Effect.void
      }
      MutableHashMap.set(entityResumptionState, address, {
        unprocessed: new Set([lastReceivedMessage.envelope.requestId]),
        interrupts: new Map()
      })
      return resumeEntityFromStorageImpl(address)
    }
    const resumeEntityFromStorageImpl = Effect.fnUntraced(
      function*(address: EntityAddress) {
        const state = entityManagers.get(address.entityType)
        if (!state) {
          MutableHashMap.remove(entityResumptionState, address)
          return
        }

        const resumptionState = Option.getOrThrow(MutableHashMap.get(entityResumptionState, address))
        let done = false

        while (!done) {
          // if the shard is no longer assigned to this runner, we stop
          if (!acquiredShards.has(address.shardId)) {
            return
          }

          // take a batch of unprocessed messages ids
          const messageIds = Arr.empty<Snowflake.Snowflake>()
          for (const id of resumptionState.unprocessed) {
            if (messageIds.length === 1024) break
            messageIds.push(id)
          }

          const messages = yield* storage.unprocessedMessagesById(messageIds)

          // this should not happen, but we handle it just in case
          if (messages.length === 0) {
            yield* Effect.sleep(config.entityMessagePollInterval)
            continue
          }

          let index = 0

          const sendWithRetry: Effect.Effect<
            void,
            EntityNotManagedByRunner
          > = Effect.catchTags(
            Effect.suspend(() => {
              if (!acquiredShards.has(address.shardId)) {
                return Effect.fail(new EntityNotManagedByRunner({ address }))
              }

              const message = messages[index]
              // check if this is a request that was interrupted
              const interrupt = message._tag === "IncomingRequest" &&
                resumptionState.interrupts.get(message.envelope.requestId)
              return interrupt ?
                Effect.flatMap(state.manager.send(message), () => {
                  resumptionState.interrupts.delete(message.envelope.requestId)
                  return state.manager.send(interrupt)
                }) :
                state.manager.send(message)
            }),
            {
              MailboxFull: () => Effect.delay(sendWithRetry, config.sendRetryInterval),
              AlreadyProcessingMessage: () => Effect.void
            }
          )

          yield* Effect.whileLoop({
            while: () => index < messages.length,
            body: constant(sendWithRetry),
            step: () => index++
          })

          for (const id of messageIds) {
            resumptionState.unprocessed.delete(id)
          }
          if (resumptionState.unprocessed.size > 0) continue

          // if we have caught up to the main storage loop, we let it take over
          yield* withStorageReadLock(Effect.sync(() => {
            if (resumptionState.unprocessed.size === 0) {
              MutableHashMap.remove(entityResumptionState, address)
              done = true
            }
          }))
        }
      },
      Effect.retry({
        while: (e) => e._tag === "PersistenceError",
        schedule: Schedule.spaced(config.entityMessagePollInterval)
      }),
      Effect.catchAllCause((cause) => Effect.logError("Could not resume unprocessed messages", cause)),
      (effect, address) =>
        Effect.annotateLogs(effect, {
          package: "@effect/cluster",
          module: "Sharding",
          fiber: "Resuming unprocessed messages",
          runner: selfAddress,
          entity: address
        }),
      (effect, address) =>
        Effect.ensuring(
          effect,
          Effect.sync(() => MutableHashMap.remove(entityResumptionState, address))
        ),
      Effect.interruptible,
      Effect.forkIn(shardingScope)
    )
  }

  // --- Sending messages ---

  const sendLocal = (
    message: Message.Outgoing<any> | Message.Incoming<any>
  ): Effect.Effect<
    void,
    EntityNotManagedByRunner | MailboxFull | AlreadyProcessingMessage
  > =>
    Effect.suspend(() => {
      const address = message.envelope.address
      if (!isEntityOnLocalShards(address)) {
        return Effect.fail(new EntityNotManagedByRunner({ address }))
      }
      const state = entityManagers.get(address.entityType)
      if (!state) {
        return Effect.fail(new EntityNotManagedByRunner({ address }))
      }

      return message._tag === "IncomingRequest" || message._tag === "IncomingEnvelope" ?
        state.manager.send(message) :
        runners.sendLocal({
          message,
          send: state.manager.sendLocal,
          simulateRemoteSerialization: config.simulateRemoteSerialization
        })
    })

  const notifyLocal = (message: Message.Outgoing<any> | Message.Incoming<any>, discard: boolean) =>
    Effect.suspend(() => {
      const address = message.envelope.address
      if (!isEntityOnLocalShards(address)) {
        return Effect.fail(new EntityNotManagedByRunner({ address }))
      }

      const notify = storageEnabled
        ? openStorageReadLatch
        : () => Effect.dieMessage("Sharding.notifyLocal: storage is disabled")

      return message._tag === "IncomingRequest" || message._tag === "IncomingEnvelope"
        ? notify()
        : runners.notifyLocal({ message, notify, discard })
    })

  const isTransientError = Predicate.or(RunnerUnavailable.is, EntityNotManagedByRunner.is)
  function sendOutgoing(
    message: Message.Outgoing<any>,
    discard: boolean,
    retries?: number
  ): Effect.Effect<void, MailboxFull | AlreadyProcessingMessage | PersistenceError> {
    return Effect.catchIf(
      Effect.suspend(() => {
        const address = message.envelope.address
        const maybeRunner = MutableHashMap.get(shardAssignments, address.shardId)
        const isPersisted = storageEnabled && Context.get(message.rpc.annotations, Persisted)
        const runnerIsLocal = Option.isSome(maybeRunner) && isLocalRunner(maybeRunner.value)
        if (isPersisted) {
          return runnerIsLocal
            ? notifyLocal(message, discard)
            : runners.notify({ address: maybeRunner, message, discard })
        } else if (Option.isNone(maybeRunner)) {
          return Effect.fail(new EntityNotManagedByRunner({ address }))
        }
        return runnerIsLocal
          ? sendLocal(message)
          : runners.send({ address: maybeRunner.value, message })
      }),
      isTransientError,
      (error) => {
        if (retries === 0) {
          return Effect.die(error)
        }
        return Effect.delay(sendOutgoing(message, discard, retries && retries - 1), config.sendRetryInterval)
      }
    )
  }

  // --- Shard Manager sync ---

  const shardManagerTimeoutFiber = yield* FiberHandle.make().pipe(
    Scope.extend(shardingScope)
  )
  const startShardManagerTimeout = FiberHandle.run(
    shardManagerTimeoutFiber,
    Effect.flatMap(Effect.sleep(config.shardManagerUnavailableTimeout), () => {
      MutableHashMap.clear(shardAssignments)
      return clearSelfShards
    }),
    { onlyIfMissing: true }
  )
  const stopShardManagerTimeout = FiberHandle.clear(shardManagerTimeoutFiber)

  // Every time the link to the shard manager is lost, we re-register the runner
  // and re-subscribe to sharding events
  yield* Effect.gen(function*() {
    yield* Effect.logDebug("Registering with shard manager")
    if (Option.isSome(config.runnerAddress)) {
      const machineId = yield* shardManager.register(config.runnerAddress.value)
      yield* snowflakeGen.setMachineId(machineId)
    }

    yield* stopShardManagerTimeout

    yield* Effect.logDebug("Subscribing to sharding events")
    const mailbox = yield* shardManager.shardingEvents
    const startedLatch = yield* Effect.makeLatch(false)

    const eventsFiber = yield* Effect.gen(function*() {
      while (true) {
        const [events] = yield* mailbox.takeAll
        for (const event of events) {
          yield* Effect.logDebug("Received sharding event", event)

          switch (event._tag) {
            case "StreamStarted": {
              yield* startedLatch.open
              break
            }
            case "ShardsAssigned": {
              for (const shard of event.shards) {
                MutableHashMap.set(shardAssignments, shard, event.address)
              }
              if (!MutableRef.get(isShutdown) && isLocalRunner(event.address)) {
                for (const shardId of event.shards) {
                  if (selfShards.has(shardId)) continue
                  selfShards.add(shardId)
                }
                yield* activeShardsLatch.open
              }
              break
            }
            case "ShardsUnassigned": {
              for (const shard of event.shards) {
                MutableHashMap.remove(shardAssignments, shard)
              }
              if (isLocalRunner(event.address)) {
                for (const shard of event.shards) {
                  selfShards.delete(shard)
                }
                yield* activeShardsLatch.open
              }
              break
            }
          }
        }
      }
    }).pipe(Effect.forkScoped)

    // Wait for the stream to be established
    yield* startedLatch.await

    // perform a full sync every config.refreshAssignmentsInterval
    const syncFiber = yield* syncAssignments.pipe(
      Effect.andThen(Effect.sleep(config.refreshAssignmentsInterval)),
      Effect.forever,
      Effect.forkScoped
    )

    yield* Fiber.joinAll([eventsFiber, syncFiber])
  }).pipe(
    Effect.scoped,
    Effect.catchAllCause((cause) => Effect.logDebug(cause)),
    Effect.zipRight(startShardManagerTimeout),
    Effect.repeat(
      Schedule.exponential(1000).pipe(
        Schedule.union(Schedule.spaced(10_000))
      )
    ),
    Effect.annotateLogs({
      package: "@effect/cluster",
      module: "Sharding",
      fiber: "ShardManager sync",
      runner: config.runnerAddress
    }),
    Effect.interruptible,
    Effect.forkIn(shardingScope)
  )

  const syncAssignments = Effect.gen(function*() {
    const assignments = yield* shardManager.getAssignments
    yield* Effect.logDebug("Received shard assignments", assignments)

    for (const [shardId, runner] of assignments) {
      if (Option.isNone(runner)) {
        MutableHashMap.remove(shardAssignments, shardId)
        selfShards.delete(shardId)
        continue
      }

      MutableHashMap.set(shardAssignments, shardId, runner.value)

      if (!isLocalRunner(runner.value)) {
        selfShards.delete(shardId)
        continue
      }
      if (MutableRef.get(isShutdown) || selfShards.has(shardId)) {
        continue
      }
      selfShards.add(shardId)
    }

    yield* activeShardsLatch.open
  })

  // --- Clients ---

  type ClientRequestEntry = {
    readonly rpc: Rpc.AnyWithProps
    readonly context: Context.Context<never>
    lastChunkId?: Snowflake.Snowflake
  }
  const clientRequests = new Map<Snowflake.Snowflake, ClientRequestEntry>()

  const clients: ResourceMap<
    Entity<any>,
    (entityId: string) => RpcClient.RpcClient<any, MailboxFull | AlreadyProcessingMessage>,
    never
  > = yield* ResourceMap.make(Effect.fnUntraced(function*(entity: Entity<any>) {
    const client = yield* RpcClient.makeNoSerialization(entity.protocol, {
      supportsAck: true,
      generateRequestId: () => RequestId(snowflakeGen.unsafeNext()),
      onFromClient(options): Effect.Effect<void, MailboxFull | AlreadyProcessingMessage | PersistenceError> {
        const address = Context.unsafeGet(options.context, ClientAddressTag)
        switch (options.message._tag) {
          case "Request": {
            const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
            const id = Snowflake.Snowflake(options.message.id)
            const rpc = entity.protocol.requests.get(options.message.tag)!
            let respond: (reply: Reply.Reply<any>) => Effect.Effect<void>
            if (!options.discard) {
              const entry: ClientRequestEntry = {
                rpc: rpc as any,
                context: fiber.currentContext
              }
              clientRequests.set(id, entry)
              respond = makeClientRespond(entry, client.write)
            } else {
              respond = clientRespondDiscard
            }
            return sendOutgoing(
              new Message.OutgoingRequest({
                envelope: Envelope.makeRequest({
                  requestId: id,
                  address,
                  tag: options.message.tag,
                  payload: options.message.payload,
                  headers: options.message.headers,
                  traceId: options.message.traceId,
                  spanId: options.message.spanId,
                  sampled: options.message.sampled
                }),
                lastReceivedReply: Option.none(),
                rpc,
                context: fiber.currentContext as Context.Context<any>,
                respond
              }),
              options.discard
            )
          }
          case "Ack": {
            const requestId = Snowflake.Snowflake(options.message.requestId)
            const entry = clientRequests.get(requestId)
            if (!entry) return Effect.void
            return sendOutgoing(
              new Message.OutgoingEnvelope({
                envelope: new Envelope.AckChunk({
                  id: snowflakeGen.unsafeNext(),
                  address,
                  requestId,
                  replyId: entry.lastChunkId!
                }),
                rpc: entry.rpc
              }),
              false
            )
          }
          case "Interrupt": {
            const requestId = Snowflake.Snowflake(options.message.requestId)
            const entry = clientRequests.get(requestId)!
            if (!entry) return Effect.void
            clientRequests.delete(requestId)
            // for durable messages, we ignore interrupts on shutdown or as a
            // result of a shard being resassigned
            const isTransientInterrupt = MutableRef.get(isShutdown) ||
              options.message.interruptors.some((id) => internalInterruptors.has(id))
            if (isTransientInterrupt && storageEnabled && Context.get(entry.rpc.annotations, Persisted)) {
              return Effect.void
            }
            return Effect.ignore(sendOutgoing(
              new Message.OutgoingEnvelope({
                envelope: new Envelope.Interrupt({
                  id: snowflakeGen.unsafeNext(),
                  address,
                  requestId
                }),
                rpc: entry.rpc
              }),
              false,
              3
            ))
          }
        }
        return Effect.void
      }
    })

    const wrappedClient: any = {}
    for (const method of Object.keys(client.client)) {
      wrappedClient[method] = function(this: any, payload: any, options?: {
        readonly context?: Context.Context<never>
      }) {
        return (client as any).client[method](payload, {
          ...options,
          context: options?.context
            ? Context.merge(options.context, this[currentClientAddress])
            : this[currentClientAddress]
        })
      }
    }

    yield* Scope.addFinalizer(
      yield* Effect.scope,
      Effect.withFiberRuntime((fiber) => {
        internalInterruptors.add(fiber.id())
        return Effect.void
      })
    )

    return (entityId: string) => {
      const id = EntityId.make(entityId)
      return {
        ...wrappedClient,
        [currentClientAddress]: ClientAddressTag.context(EntityAddress.make({
          shardId: getShardId(id),
          entityId: id,
          entityType: entity.type
        }))
      }
    }
  }))

  const makeClient = <Rpcs extends Rpc.Any>(entity: Entity<Rpcs>): Effect.Effect<
    (entityId: string) => RpcClient.RpcClient<Rpcs, MailboxFull | AlreadyProcessingMessage>
  > => clients.get(entity)

  const clientRespondDiscard = (_reply: Reply.Reply<any>) => Effect.void

  const makeClientRespond = (
    entry: ClientRequestEntry,
    write: (reply: FromServer<any>) => Effect.Effect<void>
  ) =>
  (reply: Reply.Reply<any>) => {
    switch (reply._tag) {
      case "Chunk": {
        entry.lastChunkId = reply.id
        return write({
          _tag: "Chunk",
          clientId: 0,
          requestId: RequestId(reply.requestId),
          values: reply.values
        })
      }
      case "WithExit": {
        clientRequests.delete(reply.requestId)
        return write({
          _tag: "Exit",
          clientId: 0,
          requestId: RequestId(reply.requestId),
          exit: reply.exit
        })
      }
    }
  }

  // --- Entities ---

  const context = yield* Effect.context<ShardingConfig>()
  const reaper = yield* EntityReaper
  const registerEntity: Sharding["Type"]["registerEntity"] = Effect.fnUntraced(
    function*(entity, build, options) {
      if (entityManagers.has(entity.type)) return
      const scope = yield* Scope.make()
      const manager = yield* EntityManager.make(entity, build, {
        ...options,
        storage,
        runnerAddress: Option.getOrThrow(config.runnerAddress),
        sharding
      }).pipe(
        Effect.provide(context.pipe(
          Context.add(EntityReaper, reaper),
          Context.add(Scope.Scope, scope),
          Context.add(Snowflake.Generator, snowflakeGen)
        ))
      ) as Effect.Effect<EntityManager.EntityManager>
      entityManagers.set(entity.type, {
        entity,
        scope,
        manager
      })

      yield* Scope.addFinalizer(scope, Effect.sync(() => entityManagers.delete(entity.type)))
      yield* PubSub.publish(events, EntityRegistered({ entity }))
    }
  )

  yield* Scope.addFinalizerExit(
    shardingScope,
    (exit) =>
      Effect.forEach(
        entityManagers.values(),
        (state) =>
          Effect.catchAllCause(Scope.close(state.scope, exit), (cause) =>
            Effect.annotateLogs(Effect.logError("Error closing entity manager", cause), {
              entity: state.entity.type
            })),
        { concurrency: "unbounded", discard: true }
      )
  )

  // --- Finalization ---

  if (Option.isSome(config.runnerAddress)) {
    const selfAddress = config.runnerAddress.value
    // Unregister runner from shard manager when scope is closed
    yield* Scope.addFinalizer(
      shardingScope,
      Effect.gen(function*() {
        yield* Effect.logDebug("Unregistering runner from shard manager", selfAddress)
        yield* shardManager.unregister(selfAddress).pipe(
          Effect.catchAllCause((cause) => Effect.logError("Error calling unregister with shard manager", cause))
        )
        yield* clearSelfShards
      })
    )
  }

  yield* Scope.addFinalizer(
    shardingScope,
    Effect.withFiberRuntime((fiber) => {
      MutableRef.set(isShutdown, true)
      internalInterruptors.add(fiber.id())
      return Effect.void
    })
  )

  const sharding = Sharding.of({
    getRegistrationEvents,
    getShardId,
    isShutdown: Effect.sync(() => MutableRef.get(isShutdown)),
    registerEntity,
    registerSingleton,
    makeClient,
    send: sendLocal,
    notify: (message) => notifyLocal(message, false)
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
  ShardingConfig | Runners | ShardManagerClient | MessageStorage.MessageStorage | ShardStorage
> = Layer.scoped(Sharding, make).pipe(
  Layer.provide([Snowflake.layerGenerator, EntityReaper.Default])
)

// Utilities

const ClientAddressTag = Context.GenericTag<EntityAddress>("@effect/cluster/Sharding/ClientAddress")
const currentClientAddress = Symbol.for(ClientAddressTag.key)
