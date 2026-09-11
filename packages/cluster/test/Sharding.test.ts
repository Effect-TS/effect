import type { Runner, ShardId } from "@effect/cluster"
import {
  ClusterError,
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  MachineId,
  MessageStorage,
  Runner as RunnerModule,
  RunnerAddress,
  Runners,
  RunnerStorage,
  ShardId as ShardIdModule,
  Sharding,
  ShardingConfig,
  Snowflake,
  SqlMessageStorage
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, expect, it } from "@effect/vitest"
import {
  Array,
  Cause,
  Chunk,
  Clock,
  Context,
  Effect,
  ExecutionStrategy,
  Exit,
  Fiber,
  FiberId,
  Layer,
  Mailbox,
  MutableRef,
  Option,
  Schema,
  Scope,
  Stream,
  TestClock,
  TestServices
} from "effect"
import { EntityReaper } from "../src/internal/entityReaper.js"
import { ResourceRef } from "../src/internal/resourceRef.js"
import * as RunnerHealth from "../src/RunnerHealth.js"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"
import { makeAckChunk, makeChunkReply, makeRequest, StreamRpc, StreamTest } from "./fixtures/message-storage.js"
import {
  CallerId,
  ContextBleedEntity,
  ContextBleedLayer,
  TestEntity,
  TestEntityNoState,
  TestEntityState,
  User
} from "./TestEntity.js"

describe.concurrent("Sharding", () => {
  it.scoped("delivers a message", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")
      const user = yield* client.GetUserVolatile({ id: 1 })
      expect(user).toEqual(new User({ id: 1, name: "User 1" }))
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("does not freeze the first caller's context into the entity server", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const makeClient = yield* ContextBleedEntity.client
      const client = makeClient("1")

      const first = yield* client.ReadCaller().pipe(Effect.provideService(CallerId, "A"))
      assert.strictEqual(first, "A")

      const second = yield* client.ReadCaller()
      assert.strictEqual(second, "none")

      const durable = yield* client.ReadCallerPersisted()
      assert.strictEqual(durable, "none")
    }).pipe(Effect.provide(ContextBleedSharding)))

  it.scoped("delivers a message via storage", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const driver = yield* MessageStorage.MemoryDriver
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")
      const user = yield* client.GetUser({ id: 1 })
      expect(user).toEqual(new User({ id: 1, name: "User 1" }))
      expect(driver.journal.length).toEqual(1)
      expect(driver.unprocessed.size).toEqual(0)
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("interrupts", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const state = yield* TestEntityState
      const makeClient = yield* TestEntity.client
      yield* TestClock.adjust(1)
      const client = makeClient("1")

      const fiber = yield* client.Never().pipe(Effect.fork)
      yield* TestClock.adjust(1)
      yield* Fiber.interrupt(fiber)

      yield* TestClock.adjust(1)
      expect(driver.journal.length).toEqual(2)
      expect(driver.replyIds.size).toEqual(1)
      expect(state.interrupts.unsafeSize()).toEqual(Option.some(1))
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("interrupts aren't sent for durable messages on shutdown", () =>
    Effect.gen(function*() {
      let driver!: MessageStorage.MemoryDriver
      yield* Effect.gen(function*() {
        driver = yield* MessageStorage.MemoryDriver
        const makeClient = yield* TestEntity.client
        yield* TestClock.adjust(1)
        const client = makeClient("1")
        yield* client.Never().pipe(Effect.fork)
        yield* TestClock.adjust(1)
      }).pipe(Effect.provide(TestSharding))

      // request, client interrupt is dropped
      expect(driver.journal.length).toEqual(1)
      // server interrupt is not sent
      expect(driver.replyIds.size).toEqual(0)
    }))

  it.scoped("interrupts are sent for volatile messages on shutdown", () =>
    Effect.gen(function*() {
      let interrupted = false
      const testClock = (yield* Effect.clock) as TestClock.TestClock

      yield* Effect.gen(function*() {
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        const fiber = yield* client.NeverVolatile().pipe(Effect.fork)
        yield* TestClock.adjust(1)
        const config = yield* ShardingConfig.ShardingConfig
        ;(config as any).runnerAddress = Option.some(RunnerAddress.make("localhost", 1234))
        fiber.currentScheduler.scheduleTask(
          () => {
            fiber.unsafeInterruptAsFork(FiberId.none)
            Effect.runFork(testClock.adjust(30000))
          },
          0,
          fiber
        )
      }).pipe(
        Effect.provide(TestShardingWithoutRunners.pipe(
          Layer.provide(Layer.scoped(
            Runners.Runners,
            Effect.gen(function*() {
              const runners = yield* Runners.makeNoop
              return {
                ...runners,
                send(options) {
                  if (options.message.envelope._tag === "Interrupt") {
                    interrupted = true
                    return Effect.void
                  }
                  return runners.send(options)
                }
              }
            })
          )),
          Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
          Layer.provideMerge(ShardingConfig.layer({
            entityMailboxCapacity: 10,
            entityTerminationTimeout: 30000,
            entityMessagePollInterval: 5000,
            sendRetryInterval: 100
          }))
        ))
      )

      assert.isTrue(interrupted)
    }))

  it.scoped("malformed message in storage", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const makeClient = yield* TestEntity.client
      yield* TestClock.adjust(1)
      const client = makeClient("1")

      const fiber = yield* client.Never().pipe(Effect.fork)
      yield* TestClock.adjust(1)

      const request = driver.journal[0]
      yield* driver.encoded.saveEnvelope({
        envelope: {
          id: "boom",
          _tag: "Interrupt",
          requestId: request.requestId,
          address: {
            shardId: request.address.shardId
          } as any
        },
        primaryKey: null,
        deliverAt: null
      })

      // wait for storage to poll
      yield* TestClock.adjust(5000)

      const exit = fiber.unsafePoll()
      assert(exit && Exit.isFailure(exit) && Cause.isDie(exit.cause))

      // malformed message should be left in the database
      expect(driver.journal.length).toEqual(2)
      // defect reply should be sent
      expect(driver.replyIds.size).toEqual(1)

      const reply = driver.requests.get(request.requestId)!.replies[0]
      assert(reply._tag === "WithExit" && reply.exit._tag === "Failure" && reply.exit.cause._tag === "Die")
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("MailboxFull for volatile messages", () =>
    Effect.gen(function*() {
      const makeClient = yield* TestEntity.client
      yield* TestClock.adjust(1)
      const client = makeClient("1")

      yield* client.NeverVolatile().pipe(Effect.fork, Effect.replicateEffect(10))
      yield* TestClock.adjust(1)
      const error = yield* client.NeverVolatile().pipe(Effect.flip)
      assert.strictEqual(error._tag, "MailboxFull")
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("durable messages are retried when mailbox is full", () =>
    Effect.gen(function*() {
      const requestedIds = yield* Mailbox.make<Array<Snowflake.Snowflake>>()
      yield* Effect.gen(function*() {
        const state = yield* TestEntityState
        const makeClient = yield* TestEntity.client
        yield* TestClock.adjust(1)
        const client = makeClient("1")

        const fibers = yield* client.NeverFork().pipe(Effect.fork, Effect.replicateEffect(11))
        yield* TestClock.adjust(1)

        // wait for entity to go into resume mode and request ids
        const ids = yield* requestedIds.take
        assert.strictEqual(ids.length, 1)

        // test entity should still only have 10 requests
        assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(10))

        // interrupt first request
        yield* Fiber.interrupt(fibers[0])
        yield* TestClock.adjust(100) // let retry happen

        // last request should come through
        assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(11))

        // interrupt second request, now the entity should be back in the main storage loop
        yield* Fiber.interrupt(fibers[1])

        // send another request within mailbox capacity
        yield* client.NeverFork().pipe(Effect.fork)
        yield* TestClock.adjust(1)
        yield* Fiber.interruptAll(fibers)
        yield* TestClock.adjust(100)

        // no more ids should have been requested from entity catch up
        assert.deepStrictEqual(requestedIds.unsafeSize(), Option.some(0))
      }).pipe(Effect.provide(TestShardingWithoutStorage.pipe(
        Layer.updateService(MessageStorage.MessageStorage, (storage) => ({
          ...storage,
          unprocessedMessagesById(messageIds) {
            requestedIds.unsafeOffer(Array.fromIterable(messageIds))
            return storage.unprocessedMessagesById(messageIds)
          }
        })),
        Layer.provide(MessageStorage.layerMemory),
        Layer.provide(TestShardingConfig)
      )))
    }))

  it.scoped("interrupt for future request works while mailbox is full", () =>
    Effect.gen(function*() {
      const state = yield* TestEntityState
      const makeClient = yield* TestEntity.client
      yield* TestClock.adjust(1)
      const client = makeClient("1")

      const fibers = yield* client.NeverFork().pipe(
        Effect.fork,
        Effect.replicateEffect(12)
      )
      yield* TestClock.adjust(1)

      // interrupt 11th request
      yield* Fiber.interrupt(fibers[10])
      yield* TestClock.adjust(100) // let retry happen
      // interrupt first request, and let the 11th request come through
      yield* Fiber.interrupt(fibers[0])
      yield* TestClock.adjust(100) // let retry happen

      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(11))
      // second interrupt should be sent
      assert.deepStrictEqual(state.interrupts.unsafeSize(), Option.some(2))
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("delivers a durable stream", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      yield* TestClock.adjust(1)
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")
      const users = yield* client.GetAllUsers({ ids: [1, 2, 3] }).pipe(
        Stream.runCollect
      )
      expect(Chunk.toReadonlyArray(users)).toEqual([
        new User({ id: 1, name: "User 1" }),
        new User({ id: 2, name: "User 2" }),
        new User({ id: 3, name: "User 3" })
      ])

      // 1 request, 3 acks, 4 replies
      expect(driver.journal.length).toEqual(4)
      expect(driver.replyIds.size).toEqual(4)
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("durable stream while mailbox is full", () =>
    Effect.gen(function*() {
      const requestedIds = yield* Mailbox.make<Array<Snowflake.Snowflake>>()
      yield* Effect.gen(function*() {
        const state = yield* TestEntityState
        const makeClient = yield* TestEntity.client
        yield* TestClock.adjust(1)
        const client = makeClient("1")

        const fibers = yield* client.NeverFork().pipe(Effect.fork, Effect.replicateEffect(10))
        yield* TestClock.adjust(1)

        const fiber = yield* client.GetAllUsers({ ids: [1, 2, 3] }).pipe(
          Stream.runCollect,
          Effect.fork
        )

        // wait for entity to go into resume mode and request ids
        const ids = yield* requestedIds.take
        assert.strictEqual(ids.length, 1)
        assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(10))

        // make sure entity doesn't leave resume mode
        yield* client.NeverFork().pipe(Effect.fork)
        yield* TestClock.adjust(1)

        // interrupt first request
        yield* Fiber.interrupt(fibers[0])
        yield* TestClock.adjust(100) // let retry happen

        // last request should come through
        assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(11))

        // acks should be allowed to be sent
        const users = yield* Fiber.join(fiber)
        expect(Chunk.toReadonlyArray(users)).toEqual([
          new User({ id: 1, name: "User 1" }),
          new User({ id: 2, name: "User 2" }),
          new User({ id: 3, name: "User 3" })
        ])

        const driver = yield* MessageStorage.MemoryDriver
        // 12 requests, 3 acks, 1 interrupt, 5 replies
        assert.strictEqual(driver.journal.length, 12 + 3 + 1)
        assert.strictEqual(driver.replyIds.size, 1 + 4)
      }).pipe(Effect.provide(TestShardingWithoutStorage.pipe(
        Layer.provideMerge(Layer.service(MessageStorage.MemoryDriver)),
        Layer.updateService(MessageStorage.MessageStorage, (storage) => ({
          ...storage,
          unprocessedMessagesById(messageIds) {
            requestedIds.unsafeOffer(Array.fromIterable(messageIds))
            return storage.unprocessedMessagesById(messageIds)
          }
        })),
        Layer.provide(MessageStorage.layerMemory),
        Layer.provide(TestShardingConfig)
      )))
    }))

  it.scoped("durable messages are retried on restart", () =>
    Effect.gen(function*() {
      const EnvLayer = TestShardingWithoutState.pipe(
        Layer.provide(Runners.layerNoop),
        Layer.provide(TestShardingConfig)
      )
      const driver = yield* MessageStorage.MemoryDriver
      const state = yield* TestEntityState

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        yield* Effect.fork(client.RequestWithKey({ key: "abc" }))
        yield* TestClock.adjust(1)
      }).pipe(
        Effect.provide(EnvLayer),
        Effect.scoped
      )

      // only the request should be in the journal
      expect(driver.journal.length).toEqual(1)
      expect(driver.replyIds.size).toEqual(0)
      expect(driver.unprocessed.size).toEqual(1)

      // add response
      yield* state.messages.offer(void 0)

      yield* TestClock.adjust(5000).pipe(
        Effect.provide(EnvLayer),
        Effect.scoped
      )

      expect(driver.journal.length).toEqual(1)
      expect(driver.replyIds.size).toEqual(1)
      expect(driver.unprocessed.size).toEqual(0)

      // the client should read the result from storage
      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        const result = yield* client.RequestWithKey({ key: "abc" })
        expect(result).toEqual(void 0)
      }).pipe(
        Effect.provide(EnvLayer),
        Effect.scoped
      )

      // the request should not hit the entity
      expect(driver.journal.length).toEqual(1)
      expect(driver.replyIds.size).toEqual(1)
      expect(driver.unprocessed.size).toEqual(0)
    }).pipe(Effect.provide(MessageStorage.layerMemory.pipe(
      Layer.provide(TestShardingConfig),
      Layer.merge(TestEntityState.Default)
    ))))

  it.scoped("durable streams are resumed on restart", () =>
    Effect.gen(function*() {
      const EnvLayer = TestShardingWithoutState.pipe(
        Layer.provide(Runners.layerNoop),
        Layer.provide(TestShardingConfig)
      )
      const driver = yield* MessageStorage.MemoryDriver
      const state = yield* TestEntityState

      // first chunk
      yield* state.streamMessages.offerAll([void 0, void 0])

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        yield* Effect.fork(Stream.runDrain(client.StreamWithKey({ key: "abc" })))
        yield* TestClock.adjust(1)
        // second chunk
        yield* state.streamMessages.offer(void 0)
        yield* TestClock.adjust(1)
      }).pipe(
        Effect.provide(EnvLayer),
        Effect.scoped
      )

      // 1 request, 2 acks, 2 replies
      expect(driver.journal.length).toEqual(1 + 2)
      expect(driver.replyIds.size).toEqual(2)
      expect(driver.unprocessed.size).toEqual(1)

      // third chunk
      yield* state.streamMessages.offerAll([void 0, void 0])
      yield* state.streamMessages.end

      // the client should resume
      yield* Effect.gen(function*() {
        yield* TestClock.adjust(5000) // let the shards get assigned and storage poll
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")

        // let the reply loop run
        yield* TestClock.adjust(500).pipe(Effect.fork)

        const results = Chunk.toReadonlyArray(
          yield* Stream.runCollect(client.StreamWithKey({ key: "abc" }))
        )
        expect(results).toEqual([3, 4])
      }).pipe(
        Effect.provide(EnvLayer),
        Effect.scoped
      )

      // 1 request, 3 acks, 4 replies (3 chunks + WithExit)
      expect(driver.journal.length).toEqual(1 + 3)
      expect(driver.replyIds.size).toEqual(4)
      expect(driver.unprocessed.size).toEqual(0)
    }).pipe(Effect.provide(MessageStorage.layerMemory.pipe(
      Layer.provide(TestShardingConfig),
      Layer.merge(TestEntityState.Default)
    ))))

  it.scoped("client discard option", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const driver = yield* MessageStorage.MemoryDriver
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")
      const result = yield* client.GetUser({ id: 123 }, { discard: true })
      expect(result).toEqual(void 0)
      yield* TestClock.adjust(1)
      expect(driver.journal.length).toEqual(1)
      expect(driver.unprocessed.size).toEqual(0)
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("client discard with Never", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const driver = yield* MessageStorage.MemoryDriver
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")
      const result = yield* client.Never(void 0, { discard: true })
      expect(result).toEqual(void 0)
      yield* TestClock.adjust(1)
      expect(driver.journal.length).toEqual(1)
      // should still be processing
      expect(driver.unprocessed.size).toEqual(1)
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("defect when no MessageStorage", () =>
    Effect.gen(function*() {
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")
      const cause = yield* client.Never().pipe(
        Effect.sandbox,
        Effect.flip
      )
      assert(Cause.isDie(cause))
    }).pipe(Effect.provide(TestShardingWithoutStorage.pipe(
      Layer.provide(MessageStorage.layerNoop)
    ))))

  it.scoped("restart on defect", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* TestEntityState
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")
      MutableRef.set(state.defectTrigger, true)
      const result = yield* client.GetUser({ id: 123 })
      expect(result).toEqual(new User({ id: 123, name: "User 123" }))
      expect(state.layerBuilds.current).toEqual(2)
    }).pipe(Effect.provide(TestSharding)))

  it.scoped("retries defects when building handlers", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* TestEntityState
      const makeClient = yield* TestEntity.client
      const client = makeClient("handler-build-defect")

      MutableRef.set(state.handlerBuildDefectTrigger, true)
      const result = yield* client.GetUserVolatile({ id: 123 })

      assert.deepStrictEqual(result, new User({ id: 123, name: "User 123" }))
      assert.strictEqual(state.layerBuilds.current, 2)
    }).pipe(Effect.provide(TestSharding)))

  it.effect("replays in-flight requests when restarting after a defect", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* TestEntityState
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")

      yield* client.NeverFork().pipe(Effect.fork)
      yield* TestClock.adjust(1)
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(1))

      MutableRef.set(state.defectTrigger, true)
      const result = yield* client.GetUser({ id: 123 })
      assert.deepStrictEqual(result, new User({ id: 123, name: "User 123" }))
      assert.strictEqual(state.layerBuilds.current, 2)

      yield* TestClock.adjust(1)
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(4))
    }).pipe(Effect.provide(TestSharding)))
})

describe("Sharding shard lock failover", () => {
  it.effect("interrupts entities and reacquires shards after lock storage recovers", () =>
    Effect.gen(function*() {
      const storageState = makeFailoverStorageState()
      const runnerStorage = Layer.effect(
        RunnerStorage.RunnerStorage,
        Effect.map(Effect.clock, (clock) => makeFailoverStorage(storageState, clock))
      )
      const config = ShardingConfig.layer({
        runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
        shardsPerGroup: 1,
        shardLockExpiration: 300,
        shardLockRefreshInterval: 1000,
        entityTerminationTimeout: 30_000,
        entityMessagePollInterval: 10,
        refreshAssignmentsInterval: 10,
        sendRetryInterval: 10
      })
      const layer = TestEntityNoState.pipe(
        Layer.provideMerge(Sharding.layer),
        Layer.provide(runnerStorage),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provideMerge(TestEntityState.Default),
        Layer.provide(Runners.layerNoop),
        Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
        Layer.provide(config)
      )

      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const entityState = yield* TestEntityState
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        const shardId = sharding.getShardId(EntityId.make("1"), "default")

        while (!sharding.hasShardId(shardId)) {
          yield* TestClock.adjust(10)
        }
        while (!storageState.refreshCalls.some((call) => call.shards.length > 0)) {
          yield* TestClock.adjust(100)
        }

        const entityFiber = yield* client.NeverVolatile().pipe(Effect.fork)
        yield* TestClock.adjust(1)
        assert.deepStrictEqual(entityState.envelopes.unsafeSize(), Option.some(1))

        const acquireCount = storageState.acquireCalls.length
        storageState.blackholed = true
        yield* TestClock.adjust(201)

        assert.isFalse(sharding.hasShardId(shardId))
        const entityExit = entityFiber.unsafePoll()
        assert(entityExit && Exit.isFailure(entityExit) && Cause.isInterrupted(entityExit.cause))

        yield* TestClock.adjust(1000)
        assert.strictEqual(storageState.acquireCalls.length, acquireCount)
        assert(storageState.refreshCalls.some((call) => call.shards.length === 0))

        storageState.blackholed = false
        yield* TestClock.adjust(101)
        while (!sharding.hasShardId(shardId)) {
          yield* TestClock.adjust(10)
        }

        assert.isAbove(storageState.acquireCalls.length, acquireCount)
        assert.strictEqual(storageState.releaseAllCalls.length, 1)
        assert.deepStrictEqual(yield* client.GetUserVolatile({ id: 2 }), new User({ id: 2, name: "User 2" }))
      }).pipe(Effect.provide(layer), Effect.scoped)
    }))

  it.effect("keeps the graceful timeout for normal shard reassignment", () =>
    Effect.gen(function*() {
      const storageState = makeFailoverStorageState()
      const runnerStorage = Layer.effect(
        RunnerStorage.RunnerStorage,
        Effect.map(Effect.clock, (clock) => makeFailoverStorage(storageState, clock))
      )
      const config = ShardingConfig.layer({
        runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
        shardsPerGroup: 1,
        shardLockExpiration: 3000,
        shardLockRefreshInterval: 100,
        entityTerminationTimeout: 1000,
        entityMessagePollInterval: 10,
        refreshAssignmentsInterval: 10,
        sendRetryInterval: 10
      })
      const layer = TestEntityNoState.pipe(
        Layer.provideMerge(Sharding.layer),
        Layer.provide(runnerStorage),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provideMerge(TestEntityState.Default),
        Layer.provide(Runners.layerNoop),
        Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
        Layer.provide(config)
      )

      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        const shardId = sharding.getShardId(EntityId.make("1"), "default")

        while (!sharding.hasShardId(shardId)) {
          yield* TestClock.adjust(10)
        }
        const entityFiber = yield* client.NeverVolatile().pipe(Effect.fork)
        yield* TestClock.adjust(1)

        storageState.assignSelf = false
        for (let i = 0; i < 100 && sharding.hasShardId(shardId); i++) {
          yield* TestClock.adjust(10)
        }
        assert.isFalse(sharding.hasShardId(shardId))
        for (let i = 0; i < 200 && (yield* sharding.activeEntityCount) > 0; i++) {
          yield* TestClock.adjust(10)
        }
        assert.strictEqual(yield* sharding.activeEntityCount, 0)

        assert.isNull(entityFiber.unsafePoll())
        assert.strictEqual(storageState.releaseCalls.length, 0)
        yield* TestClock.adjust(900)
        assert.isNull(entityFiber.unsafePoll())
        assert.strictEqual(storageState.releaseCalls.length, 0)

        for (let i = 0; i < 20 && entityFiber.unsafePoll() === null; i++) {
          yield* TestClock.adjust(10)
        }
        const entityExit = entityFiber.unsafePoll()
        assert(entityExit && Exit.isFailure(entityExit) && Cause.isInterrupted(entityExit.cause))
        assert.strictEqual(storageState.releaseCalls.length, 1)
      }).pipe(
        Effect.ensuring(TestClock.adjust(2000)),
        Effect.provide(layer),
        Effect.scoped
      )
    }), 10_000)

  it.effect("does not wait for entity construction before a forced shard release", () =>
    Effect.gen(function*() {
      const storageState = makeFailoverStorageState()
      const runnerStorage = Layer.effect(
        RunnerStorage.RunnerStorage,
        Effect.map(Effect.clock, (clock) => makeFailoverStorage(storageState, clock))
      )
      const config = ShardingConfig.layer({
        runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
        shardsPerGroup: 1,
        shardLockExpiration: 300,
        shardLockRefreshInterval: 1000,
        entityTerminationTimeout: 0,
        entityMessagePollInterval: 10,
        refreshAssignmentsInterval: 10,
        sendRetryInterval: 10
      })
      const layer = TestEntityNoState.pipe(
        Layer.provideMerge(Sharding.layer),
        Layer.provide(runnerStorage),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provideMerge(TestEntityState.Default),
        Layer.provide(Runners.layerNoop),
        Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
        Layer.provide(config)
      )

      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const entityState = yield* TestEntityState
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        const shardId = sharding.getShardId(EntityId.make("1"), "default")

        while (!sharding.hasShardId(shardId)) {
          yield* TestClock.adjust(10)
        }
        while (!storageState.refreshCalls.some((call) => call.shards.length > 0)) {
          yield* TestClock.adjust(100)
        }

        yield* Effect.gen(function*() {
          entityState.buildLatch.unsafeClose()
          const entityFiber = yield* client.GetUserVolatile({ id: 1 }).pipe(Effect.fork)
          while (entityState.layerBuilds.current === 0) {
            yield* TestClock.adjust(1)
          }

          storageState.blackholed = true
          yield* TestClock.adjust(201)
          assert.isFalse(sharding.hasShardId(shardId))

          storageState.blackholed = false
          yield* TestClock.adjust(1000)

          assert.strictEqual(storageState.releaseAllCalls.length, 1)
          entityState.buildLatch.unsafeOpen()
          yield* TestClock.adjust(1)
          yield* Fiber.interrupt(entityFiber)
        }).pipe(Effect.ensuring(entityState.buildLatch.open))
      }).pipe(Effect.provide(layer), Effect.scoped)
    }))

  it.effect("does not acquire shards while a forced release is pending", () =>
    Effect.gen(function*() {
      const shardsPerGroup = 4
      const storageState = makeFailoverStorageState({
        otherRunnerHealthy: true,
        releaseAllDuration: 500
      })
      const runnerStorage = Layer.effect(
        RunnerStorage.RunnerStorage,
        Effect.map(Effect.clock, (clock) => makeFailoverStorage(storageState, clock))
      )
      const config = ShardingConfig.layer({
        runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
        shardsPerGroup,
        shardLockExpiration: 300,
        shardLockRefreshInterval: 1000,
        entityTerminationTimeout: 0,
        entityMessagePollInterval: 10,
        refreshAssignmentsInterval: 10,
        sendRetryInterval: 10
      })
      const layer = TestEntityNoState.pipe(
        Layer.provideMerge(Sharding.layer),
        Layer.provide(runnerStorage),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provideMerge(TestEntityState.Default),
        Layer.provide(Runners.layerNoop),
        Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
        Layer.provide(config)
      )

      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const allShards = Array.makeBy(shardsPerGroup, (i) => ShardIdModule.make("default", i + 1))
        const ownedCount = () => allShards.filter((shardId) => sharding.hasShardId(shardId)).length

        while (ownedCount() === 0) {
          yield* TestClock.adjust(10)
        }
        assert.isBelow(ownedCount(), shardsPerGroup)
        while (!storageState.refreshCalls.some((call) => call.shards.length > 0)) {
          yield* TestClock.adjust(100)
        }

        const acquiresBeforeOutage = storageState.acquireCalls.length
        storageState.blackholed = true
        yield* TestClock.adjust(201)
        assert.strictEqual(ownedCount(), 0)

        storageState.otherRunnerHealthy = false
        yield* TestClock.adjust(100)
        assert.strictEqual(storageState.releaseAllCalls.length, 0)

        storageState.blackholed = false
        while (storageState.releaseAllCalls.length === 0) {
          yield* TestClock.adjust(10)
        }
        while (!storageState.releaseAllCalls[0].completed) {
          yield* TestClock.adjust(10)
        }
        storageState.releaseAllDuration = 0

        while (ownedCount() < shardsPerGroup) {
          yield* TestClock.adjust(10)
        }

        assert.strictEqual(storageState.releaseAllCalls.length, 1)
        assert(
          storageState.acquireCalls
            .slice(acquiresBeforeOutage)
            .every((call) => call.completedReleaseAlls > 0)
        )
      }).pipe(Effect.provide(layer), Effect.scoped)
    }))
})

interface FailoverStorageState {
  blackholed: boolean
  assignSelf: boolean
  otherRunnerHealthy: boolean
  releaseAllDuration: number
  runner: Runner.Runner | undefined
  readonly acquireCalls: Array<{
    readonly shards: ReadonlyArray<ShardId.ShardId>
    readonly completedReleaseAlls: number
  }>
  readonly refreshCalls: Array<{
    readonly at: number
    readonly shards: ReadonlyArray<ShardId.ShardId>
  }>
  readonly releaseCalls: Array<ShardId.ShardId>
  readonly releaseAllCalls: Array<{ completed: boolean }>
}

const makeFailoverStorageState = (
  overrides?: Partial<FailoverStorageState>
): FailoverStorageState => ({
  blackholed: false,
  assignSelf: true,
  otherRunnerHealthy: false,
  releaseAllDuration: 0,
  runner: undefined,
  acquireCalls: [],
  refreshCalls: [],
  releaseCalls: [],
  releaseAllCalls: [],
  ...overrides
})

const makeFailoverStorage = (state: FailoverStorageState, clock: Clock.Clock) =>
  RunnerStorage.RunnerStorage.of({
    getRunners: Effect.sync(() => {
      if (!state.runner) return []
      if (!state.assignSelf) return [[state.runner, false], [otherRunner, true]]
      return state.otherRunnerHealthy ? [[state.runner, true], [otherRunner, true]] : [[state.runner, true]]
    }),
    register: (runner) =>
      Effect.sync(() => {
        state.runner = runner
        return MachineId.make(1)
      }),
    unregister: () => Effect.void,
    setRunnerHealth: () => Effect.void,
    acquire: (_address, shardIds) =>
      Effect.sync(() => {
        const shards = globalThis.Array.from(shardIds)
        state.acquireCalls.push({
          shards,
          completedReleaseAlls: state.releaseAllCalls.filter((call) => call.completed).length
        })
        return shards
      }),
    refresh: (_address, shardIds) =>
      Effect.suspend(() => {
        const shards = globalThis.Array.from(shardIds)
        state.refreshCalls.push({
          at: clock.unsafeCurrentTimeMillis(),
          shards
        })
        return state.blackholed ? Effect.never : Effect.succeed(shards)
      }),
    release: (_address, shardId) =>
      Effect.sync(() => {
        state.releaseCalls.push(shardId)
      }),
    releaseAll: () =>
      Effect.suspend(() => {
        const call = { completed: false }
        state.releaseAllCalls.push(call)
        return Effect.andThen(
          Effect.sleep(state.releaseAllDuration),
          Effect.sync(() => {
            call.completed = true
          })
        )
      })
  })

const otherRunner = RunnerModule.make({
  address: RunnerAddress.make("localhost", 5678),
  groups: ["default"],
  weight: 1
})

const TestShardingConfig = ShardingConfig.layer({
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100
})

const TestShardingWithoutState = TestEntityNoState.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop)
  // Layer.provide(Logger.minimumLogLevel(LogLevel.All)),
  // Layer.provideMerge(Logger.pretty)
)

const TestShardingWithoutRunners = TestShardingWithoutState.pipe(
  Layer.provideMerge(TestEntityState.Default)
)

const TestShardingWithoutStorage = TestShardingWithoutRunners.pipe(
  Layer.provide(Runners.layerNoop),
  Layer.provide(TestShardingConfig)
)

const TestSharding = TestShardingWithoutStorage.pipe(
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(TestShardingConfig)
)

const ContextBleedSharding = ContextBleedLayer.pipe(Layer.provideMerge(TestSharding))

describe("entity registration and outgoing requests", () => {
  const TestShardingConfig = ShardingConfig.layer({
    entityMailboxCapacity: 10,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 5000,
    sendRetryInterval: 100
  })
  const TestSharding = TestEntityNoState.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provideMerge(TestEntityState.Default),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(TestShardingConfig)
  )

  it.effect("uses services provided when registering an entity", () =>
    Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding
      yield* sharding.registerEntity(RegistrationContextEntity, RegistrationContextHandlers).pipe(
        Effect.provideService(RegistrationContext, "registration")
      )
      yield* TestClock.adjust(1)

      const client = (yield* RegistrationContextEntity.client)("1")
      assert.strictEqual(yield* client.Read(), "registration")
    }).pipe(
      Effect.provide(TestSharding),
      Effect.provideService(RegistrationContext, "construction"),
      Effect.scoped
    ))

  class RegistrationContext
    extends Context.Tag("effect/test/cluster/RegistrationContext")<RegistrationContext, string>()
  {}

  const RegistrationContextEntity = Entity.make("RegistrationContextEntity", [
    Rpc.make("Read", { success: Schema.String }).annotate(ClusterSchema.Persisted, false)
  ])

  const RegistrationContextHandlers = Effect.map(
    RegistrationContext,
    (value) => RegistrationContextEntity.of({ Read: () => Effect.succeed(value) })
  )

  it.effect("holds durable messages while entity layers are still building", () =>
    Effect.gen(function*() {
      const config = ShardingConfig.layer({
        entityMailboxCapacity: 10,
        entityRegistrationTimeout: 6000,
        entityTerminationTimeout: 0,
        entityMessagePollInterval: 100,
        sendRetryInterval: 100,
        refreshAssignmentsInterval: 100
      })
      const env = TestEntityNoState.pipe(
        Layer.provideMerge(Sharding.layer),
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(Runners.layerNoop),
        Layer.provide(config)
      )
      const delayedEnv = TestEntityNoState.pipe(
        Layer.provide(Layer.effectDiscard(Effect.sleep(10_000))),
        Layer.provideMerge(Sharding.layer),
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(Runners.layerNoop),
        Layer.provide(config)
      )
      const driver = yield* MessageStorage.MemoryDriver
      const state = yield* TestEntityState

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        yield* client.RequestWithKey({ key: "slow-registration" }).pipe(Effect.fork)
        yield* TestClock.adjust(1)
      }).pipe(
        Effect.provide(env),
        Effect.scoped
      )

      assert.strictEqual(driver.journal.length, 1)
      assert.strictEqual(driver.replyIds.size, 0)
      assert.strictEqual(driver.unprocessed.size, 1)

      const fiber = yield* Effect.never.pipe(
        Effect.provide(delayedEnv),
        Effect.scoped,
        Effect.fork
      )

      yield* TestClock.adjust(7500)
      assert.strictEqual(driver.replyIds.size, 0)
      assert.strictEqual(driver.unprocessed.size, 1)

      yield* TestClock.adjust(2500)
      yield* state.messages.offer(void 0)
      yield* TestClock.adjust(100)

      assert.strictEqual(driver.replyIds.size, 1)
      assert.strictEqual(driver.unprocessed.size, 0)
      yield* Fiber.interrupt(fiber)
    }).pipe(Effect.provide(MessageStorage.layerMemory.pipe(
      Layer.provide(ShardingConfig.layer({})),
      Layer.merge(TestEntityState.Default)
    ))))

  it.effect("volatile discard returns while the handler is still processing", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* TestEntityState
      const client = (yield* TestEntity.client)("discard")
      const result = yield* client.NeverVolatile(void 0, { discard: true }).pipe(
        Effect.timeoutOption(100),
        TestServices.provideLive
      )
      assert(Option.isSome(result), "volatile discard waited for the handler reply")
      assert.isUndefined(result.value)
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(1))
    }).pipe(Effect.provide(TestSharding)))
  for (const persisted of [false, true]) {
    for (const discard of [false, true]) {
      for (const preemptiveShutdown of [false, true]) {
        it.effect(`settles outgoing sends after shutdown (persisted=${persisted}, discard=${discard}, preemptive=${preemptiveShutdown})`, () =>
          Effect.gen(function*() {
            const storage = yield* MessageStorage.MessageStorage
            const rpc = Rpc.make("ShutdownPing").annotate(ClusterSchema.Persisted, persisted)
            const request = yield* makeRequest({ rpc, payload: undefined })
            const scope = yield* Scope.make()
            const context = yield* Layer.build(Sharding.layer.pipe(
              Layer.provide(RunnerStorage.layerMemory),
              Layer.provide(RunnerHealth.layerNoop),
              Layer.provide(Runners.layerNoop),
              Layer.provide(ShardingConfig.layer({
                runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
                shardsPerGroup: 1,
                entityTerminationTimeout: 0,
                sendRetryInterval: 10,
                preemptiveShutdown
              }))
            )).pipe(Scope.extend(scope))
            const sharding = Context.get(context, Sharding.Sharding)
            yield* TestClock.adjust(1)
            yield* Scope.close(scope, Exit.void)
            assert.isTrue(yield* sharding.isShutdown)
            const result = yield* sharding.sendOutgoing(request, discard).pipe(
              Effect.fork,
              Effect.flatMap(Fiber.await),
              Effect.timeoutOption(100),
              TestServices.provideLive
            )
            assert(Option.isSome(result), "outgoing send did not settle after shutdown")
            if (discard) {
              assert(Exit.isSuccess(result.value))
            } else {
              assert(Exit.isFailure(result.value))
              if (persisted) {
                assert(Cause.isInterruptedOnly(result.value.cause))
              } else {
                assert.instanceOf(Cause.squash(result.value.cause), ClusterError.EntityNotAssignedToRunner)
              }
            }
            assert.strictEqual(
              (yield* storage.unprocessedMessages([request.envelope.address.shardId])).length,
              persisted ? 1 : 0
            )
          }).pipe(Effect.provide(MessageStorage.layerMemory.pipe(
            Layer.provideMerge(Snowflake.layerGenerator),
            Layer.provide(ShardingConfig.layerDefaults)
          ))))
      }
    }
  }

  it.scoped("forwards user interrupts from a fiber that previously rebuilt a resource", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const driver = yield* MessageStorage.MemoryDriver
      const state = yield* TestEntityState
      const ref = yield* ResourceRef.from(yield* Effect.scope, () => Effect.succeed(1))
      yield* ref.unsafeRebuild()
      const client = (yield* TestEntity.client)("after-rebuild")
      const request = yield* Effect.fork(client.Never())
      yield* TestClock.adjust(1)
      yield* Fiber.interrupt(request)
      yield* TestClock.adjust(1)
      assert.strictEqual(driver.journal.filter((envelope) => envelope._tag === "Interrupt").length, 1)
      assert.deepStrictEqual(state.interrupts.unsafeSize(), Option.some(1))
    }).pipe(Effect.provide(TestSharding)))

  for (const duringTeardown of [false, true]) {
    it.effect(`forwards persisted cancellation in another Sharding (during teardown=${duringTeardown})`, () =>
      Effect.gen(function*() {
        const teardownStarted = yield* Effect.makeLatch()
        const releaseTeardown = yield* Effect.makeLatch()
        const callerFinished = yield* Effect.makeLatch()
        const caller = Entity.make("TeardownIsolationCaller", [
          Rpc.make("Address", { success: EntityAddress.EntityAddress }),
          Rpc.make("Run")
        ]).annotateRpcs(ClusterSchema.Persisted, false)
        const makeLayer = (holdTeardown: boolean) =>
          caller.toLayer(Effect.gen(function*() {
            const address = yield* Entity.CurrentAddress
            const client = (yield* TestEntity.client)("target")
            if (holdTeardown) {
              yield* Effect.addFinalizer(() => teardownStarted.open.pipe(Effect.andThen(releaseTeardown.await)))
            }
            return {
              Address: () => Effect.succeed(address),
              Run: () => client.Never().pipe(Effect.orDie, Effect.ensuring(callerFinished.open))
            }
          })).pipe(Layer.provideMerge(TestSharding))
        const scope = yield* Effect.scope
        const closingScope = yield* Scope.fork(scope, ExecutionStrategy.sequential)
        const closingContext = yield* Layer.build(makeLayer(true)).pipe(Scope.extend(closingScope))
        const activeContext = yield* Layer.build(makeLayer(false))
        const closingSharding = Context.get(closingContext, Sharding.Sharding)
        const activeSharding = Context.get(activeContext, Sharding.Sharding)
        const driver = Context.get(activeContext, MessageStorage.MemoryDriver)
        const state = Context.get(activeContext, TestEntityState)
        assert.notStrictEqual(closingSharding, activeSharding)
        assert.notStrictEqual(Context.get(closingContext, MessageStorage.MemoryDriver), driver)
        yield* TestClock.adjust(1)
        const closingClient = (yield* caller.client.pipe(Effect.provide(closingContext)))("same-id")
        const activeClient = (yield* caller.client.pipe(Effect.provide(activeContext)))("same-id")
        assert.deepStrictEqual(yield* closingClient.Address(), yield* activeClient.Address())
        const request = yield* activeClient.Run().pipe(Effect.fork)
        const envelope = yield* state.envelopes.take
        assert.strictEqual(envelope.tag, "Never")
        assert.strictEqual(driver.journal.length, 1)
        assert.deepStrictEqual(state.interrupts.unsafeSize(), Option.some(0))

        const closing = yield* Scope.close(closingScope, Exit.void).pipe(Effect.fork)
        yield* Effect.gen(function*() {
          yield* TestClock.adjust(1)
          yield* teardownStarted.await
          assert.isNull(closing.unsafePoll(), "the other Sharding must be paused inside entity teardown")
          if (!duringTeardown) {
            yield* releaseTeardown.open
            yield* Fiber.join(closing)
          }
          assert.isFalse(yield* activeSharding.isShutdown)
          yield* Fiber.interrupt(request)
          yield* callerFinished.await
          yield* TestClock.adjust(1)
          const interrupts = driver.journal.filter((entry) =>
            entry._tag === "Interrupt" && entry.requestId === String(envelope.requestId)
          )
          assert.deepStrictEqual({
            persistedInterrupts: interrupts.length,
            handlerInterrupts: state.interrupts.unsafeSize()
          }, {
            persistedInterrupts: 1,
            handlerInterrupts: Option.some(1)
          })
        }).pipe(Effect.ensuring(releaseTeardown.open.pipe(Effect.andThen(Fiber.join(closing)))))
      }).pipe(Effect.scoped))
  }
})

describe("registration", () => {
  const config = ShardingConfig.layer({
    shardsPerGroup: 1,
    entityRegistrationTimeout: 6000,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 100,
    refreshAssignmentsInterval: 100,
    sendRetryInterval: 10
  })
  const sharding = Sharding.layer.pipe(
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(Runners.layerNoop),
    Layer.provide(config)
  )
  const rpc = Rpc.make("Ping", { payload: { id: Schema.Number }, success: Schema.String }).annotate(
    ClusterSchema.Persisted,
    true
  )
  const entity = Entity.make("test", [rpc])

  for (const backend of ["memory", "sqlite"] as const) {
    const storage = (backend === "memory" ? MessageStorage.layerMemory : SqlMessageStorage.layer.pipe(
      Layer.provide(SqliteClient.layer({ filename: ":memory:" }))
    )).pipe(Layer.provideMerge(Snowflake.layerGenerator), Layer.provide(config))

    it.effect(`${backend} holds persisted rows through slow registration`, () =>
      Effect.gen(function*() {
        const store = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest({ rpc })
        yield* store.saveRequest(request)
        const delayed = entity.toLayer({ Ping: () => Effect.succeed("done") }).pipe(
          Layer.provide(Layer.effectDiscard(Effect.sleep(10_000))),
          Layer.provideMerge(sharding)
        )
        const owner = yield* Effect.never.pipe(Effect.provide(delayed), Effect.fork)
        yield* TestClock.adjust(7500)
        assert.deepStrictEqual(yield* store.repliesFor([request]), [])
        yield* TestClock.adjust(3000)
        const replies = yield* store.repliesFor([request])
        assert.strictEqual(replies.length, 1)
        assert(replies[0]._tag === "WithExit")
        assert.deepStrictEqual(replies[0].exit, Exit.succeed("done"))
        yield* Fiber.interrupt(owner)
      }).pipe(Effect.scoped, Effect.provide(storage)))

    it.effect(`${backend} eventually fails a request whose entity never registers`, () =>
      Effect.gen(function*() {
        const store = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest({ rpc })
        yield* store.saveRequest(request)
        const owner = yield* Effect.never.pipe(Effect.provide(sharding), Effect.fork)
        yield* TestClock.adjust(7500)
        assert.deepStrictEqual(yield* store.repliesFor([request]), [], "allow the two-interval fallback")
        yield* TestClock.adjust(6000)
        const replies = yield* store.repliesFor([request])
        assert.strictEqual(replies.length, 1)
        assert(replies[0]._tag === "WithExit" && Exit.isFailure(replies[0].exit))
        assert.include(Cause.pretty(replies[0].exit.cause), "not registered")
        yield* Fiber.interrupt(owner)
      }).pipe(Effect.scoped, Effect.provide(storage)))
  }

  it.effect("registration cannot replace the runner's clock, config, reaper or snowflake generator", () =>
    Effect.gen(function*() {
      const service = yield* Sharding.Sharding
      const actualClock = yield* Effect.clock
      const foreignClock = { ...actualClock, unsafeCurrentTimeMillis: () => -1 }
      const foreignConfig = { ...(yield* ShardingConfig.ShardingConfig), entityMailboxCapacity: 999 }
      const foreignReaper = new EntityReaper({ register: () => Effect.die("foreign reaper") })
      const foreignGenerator = {
        ...(yield* Snowflake.Generator),
        unsafeNext: () => {
          throw new Error("foreign generator")
        }
      }
      const protectedEntity = Entity.make("ProtectedRegistration", [
        Rpc.make("Read", { success: Schema.Boolean }).annotate(ClusterSchema.Persisted, false)
      ])
      yield* service.registerEntity(
        protectedEntity,
        Effect.gen(function*() {
          const ownConfig = yield* ShardingConfig.ShardingConfig
          const ownClock = yield* Effect.clock
          const reaper = yield* EntityReaper
          const generator = yield* Snowflake.Generator
          return {
            Read: () =>
              Effect.succeed(
                ownConfig !== foreignConfig && ownClock !== foreignClock && reaper !== foreignReaper &&
                  generator !== foreignGenerator
              )
          }
        })
      ).pipe(
        Effect.provideService(Clock.Clock, foreignClock),
        Effect.provideService(ShardingConfig.ShardingConfig, foreignConfig),
        Effect.provideService(EntityReaper, foreignReaper),
        Effect.provideService(Snowflake.Generator, foreignGenerator)
      )
      yield* TestClock.adjust(1)
      assert.isTrue(yield* (yield* protectedEntity.client)("one").Read())
    }).pipe(
      Effect.scoped,
      Effect.provide(sharding),
      Effect.provide(MessageStorage.layerMemory.pipe(
        Layer.provideMerge(Snowflake.layerGenerator),
        Layer.provideMerge(config)
      ))
    ))
})

describe("shutdown", () => {
  for (const persisted of [false, true]) {
    for (const discard of [false, true]) {
      for (const preemptiveShutdown of [false, true]) {
        it.effect(
          `finalizing entity settles nested request (persisted=${persisted}, discard=${discard}, preemptive=${preemptiveShutdown})`,
          () =>
            Effect.gen(function*() {
              const ready = yield* Effect.makeLatch()
              let finalized = false
              const receiver = Entity.make("FinalizerReceiver", [
                Rpc.make("Ping").annotate(ClusterSchema.Persisted, persisted)
              ])
              const sender = Entity.make("FinalizerSender", [Rpc.make("Arm").annotate(ClusterSchema.Persisted, false)])
              const env = Layer.merge(
                receiver.toLayer({ Ping: () => Effect.void }),
                sender.toLayer(Effect.gen(function*() {
                  const client = (yield* receiver.client)("peer")
                  yield* Effect.addFinalizer(() =>
                    client.Ping(undefined, { discard }).pipe(
                      Effect.exit,
                      Effect.tap(() =>
                        Effect.sync(() => {
                          finalized = true
                        })
                      )
                    )
                  )
                  return { Arm: () => Effect.void }
                }))
              ).pipe(
                Layer.provideMerge(Sharding.layer),
                Layer.provide(RunnerStorage.layerMemory),
                Layer.provide(RunnerHealth.layerNoop),
                Layer.provide(Runners.layerNoop),
                Layer.provideMerge(MessageStorage.layerMemory),
                Layer.provide(
                  ShardingConfig.layer({
                    shardsPerGroup: 1,
                    entityTerminationTimeout: 0,
                    entityMessagePollInterval: 20,
                    refreshAssignmentsInterval: 20,
                    sendRetryInterval: 10,
                    preemptiveShutdown
                  })
                )
              )
              const fiber = yield* Effect.gen(function*() {
                const sharding = yield* Sharding.Sharding
                const shard = sharding.getShardId(EntityId.make("one"), "default")
                while (!sharding.hasShardId(shard)) yield* Effect.sleep(5)
                yield* (yield* sender.client)("one").Arm()
                yield* ready.open
                return yield* Effect.never
              }).pipe(Effect.provide(env), Effect.forkDaemon)
              yield* ready.await.pipe(Effect.timeout("3 seconds"))
              fiber.unsafeInterruptAsFork(FiberId.none)
              const exit = yield* Fiber.await(fiber).pipe(Effect.timeoutOption("3 seconds"))
              assert(Option.isSome(exit), "closing a finalizing entity left an outgoing retry loop running")
              assert.isTrue(finalized)
            }).pipe(TestServices.provideLive),
          10_000
        )
      }
    }
  }

  for (const persisted of [false, true]) {
    it.effect(`abandoned AckChunk returns a routing error (persisted=${persisted})`, () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const rpc = StreamRpc.annotate(ClusterSchema.Persisted, persisted)
        const request = yield* makeRequest({ rpc, payload: new StreamTest({ id: 1 }) })
        const scope = yield* Scope.make()
        const context = yield* Layer.build(Sharding.layer.pipe(
          Layer.provide(RunnerStorage.layerMemory),
          Layer.provide(RunnerHealth.layerNoop),
          Layer.provide(Runners.layerNoop),
          Layer.provide(ShardingConfig.layer({ entityTerminationTimeout: 0, sendRetryInterval: 10 }))
        )).pipe(Scope.extend(scope))
        yield* TestClock.adjust(1)
        yield* Scope.close(scope, Exit.void)
        yield* storage.saveRequest(request)
        const chunk = yield* makeChunkReply(request)
        yield* storage.saveReply(chunk)
        const ack = yield* makeAckChunk(request, chunk)
        const result = yield* Context.get(context, Sharding.Sharding).sendOutgoing(ack, false).pipe(
          Effect.exit,
          Effect.timeoutOption(200),
          TestServices.provideLive
        )
        assert(Option.isSome(result), "AckChunk retry loop did not settle")
        assert(Exit.isFailure(result.value))
        assert.instanceOf(Cause.squash(result.value.cause), ClusterError.EntityNotAssignedToRunner)
      }).pipe(Effect.provide(MemoryLive)))
  }

  it.effect("RPC cleanup does not journal cancellation after a marked abandonment while Sharding is alive", () =>
    Effect.gen(function*() {
      const cause = yield* abandonmentCause
      const storage = yield* MessageStorage.MessageStorage
      const driver = yield* MessageStorage.MemoryDriver
      const noop = yield* Runners.makeNoop.pipe(Effect.provide(ShardingConfig.layerDefaults))
      const entity = Entity.make("RpcAbandonment", [Rpc.make("Run").annotate(ClusterSchema.Persisted, true)])
      const layer = Sharding.layer.pipe(
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(
          Layer.succeed(Runners.Runners, {
            ...noop,
            notify: ({ message }) =>
              (message._tag === "OutgoingRequest" ? storage.saveRequest(message) : storage.saveEnvelope(message)).pipe(
                Effect.orDie,
                Effect.andThen(Effect.failCause(cause))
              )
          })
        ),
        Layer.provide(ShardingConfig.layer({ runnerAddress: Option.none(), sendRetryInterval: 10 }))
      )
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const exit = yield* (yield* entity.client)("one").Run().pipe(Effect.fork, Effect.flatMap(Fiber.await))
        assert(Exit.isFailure(exit) && Cause.isInterruptedOnly(exit.cause))
        assert.isFalse(yield* sharding.isShutdown)
        assert.deepStrictEqual(driver.journal.map((e) => e._tag), ["Request"])
      }).pipe(Effect.provide(layer))
    }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
})

describe("nested teardown", () => {
  const layer = TestEntityNoState.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provideMerge(TestEntityState.Default),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(
      ShardingConfig.layer({
        shardsPerGroup: 1,
        entityTerminationTimeout: 0,
        entityMessagePollInterval: 100,
        refreshAssignmentsInterval: 100,
        sendRetryInterval: 10,
        preemptiveShutdown: false
      })
    )
  )

  for (const reason of ["idle reap", "registration scope close"]) {
    it.effect(`nested persisted call survives caller ${reason}`, () =>
      Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const driver = yield* MessageStorage.MemoryDriver
        const state = yield* TestEntityState
        const scope = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
        const caller = Entity.make("NestedTeardownCaller", [Rpc.make("Arm").annotate(ClusterSchema.Persisted, false)])
        yield* sharding.registerEntity(
          caller,
          Effect.gen(function*() {
            yield* (yield* TestEntity.client)("nested-target").Never().pipe(Effect.forkScoped)
            return { Arm: () => Effect.void }
          }),
          { maxIdleTime: 1 }
        ).pipe(Scope.extend(scope))
        yield* TestClock.adjust(1)
        yield* (yield* caller.client)("one").Arm()
        yield* TestClock.adjust(1)
        assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(1))
        if (reason === "registration scope close") {
          yield* Scope.close(scope, Exit.void)
        } else {
          for (let i = 0; i < 12 && (yield* sharding.activeEntityCount) > 1; i++) yield* TestClock.adjust(5000)
        }
        assert.strictEqual(yield* sharding.activeEntityCount, 1)
        assert.isFalse(yield* sharding.isShutdown)
        assert.strictEqual(driver.journal.filter((e) => e._tag === "Interrupt").length, 0)
        assert.deepStrictEqual(state.interrupts.unsafeSize(), Option.some(0))
      }).pipe(Effect.scoped, Effect.provide(layer)))
  }
})
