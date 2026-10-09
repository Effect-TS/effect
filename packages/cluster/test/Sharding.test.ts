import type { Runner, ShardId } from "@effect/cluster"
import {
  ClusterError,
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  MachineId,
  Message,
  MessageStorage,
  Runner as RunnerModule,
  RunnerAddress,
  Runners,
  RunnerStorage,
  ShardId as ShardIdModule,
  Sharding,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Headers } from "@effect/platform"
import { Rpc } from "@effect/rpc"
import { assert, describe, expect, it } from "@effect/vitest"
import {
  Array,
  Cause,
  Chunk,
  Context,
  Effect,
  Equal,
  Exit,
  Fiber,
  FiberId,
  Layer,
  Mailbox,
  MutableRef,
  Option,
  Scope,
  Stream,
  TestClock
} from "effect"
import type { Clock } from "effect"
import * as EntityManager from "../src/internal/entityManager.js"
import { EntityReaper } from "../src/internal/entityReaper.js"
import * as RunnerHealth from "../src/RunnerHealth.js"
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

  it.scoped("retries client interrupts to the runner processing the request", () =>
    Effect.gen(function*() {
      const requestedOn: Array<RunnerAddress.RunnerAddress> = []
      const interruptedOn: Array<RunnerAddress.RunnerAddress> = []
      const runners = Layer.scoped(
        Runners.Runners,
        Effect.map(Runners.makeNoop, (runners) => {
          let failInterrupt = true
          return {
            ...runners,
            send: ({ address, message }) =>
              Effect.suspend(() => {
                if (message._tag === "OutgoingRequest") {
                  requestedOn.push(address)
                  return Effect.never
                }
                if (failInterrupt) {
                  failInterrupt = false
                  return Effect.fail(new ClusterError.RunnerUnavailable({ address }))
                }
                interruptedOn.push(address)
                return Effect.void
              })
          }
        })
      )
      const runnerStorage = Layer.effect(
        RunnerStorage.RunnerStorage,
        Effect.tap(
          RunnerStorage.makeMemory,
          (storage) =>
            storage.register(RunnerModule.make({ address: otherRunner.address, groups: ["default"], weight: 1 }), true)
        )
      )

      yield* Effect.gen(function*() {
        const client = (yield* TestEntity.client)("1")
        const fiber = yield* client.NeverVolatile().pipe(Effect.fork)
        while (requestedOn.length === 0) {
          yield* TestClock.adjust(10)
        }
        yield* Effect.fork(Fiber.interrupt(fiber))
        yield* TestClock.adjust(1000)
        assert.deepStrictEqual(interruptedOn, [otherRunner.address])
      }).pipe(
        Effect.provide(TestEntityNoState.pipe(
          Layer.provideMerge(Sharding.layer),
          Layer.provide([runnerStorage, runners, RunnerHealth.layerNoop, TestEntityState.Default]),
          Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
          Layer.provide(ShardingConfig.layer({
            runnerAddress: Option.none(),
            refreshAssignmentsInterval: 10,
            sendRetryInterval: 100
          }))
        ))
      )
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

  it.effect("interrupts non-persisted streams when restarting after a defect", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* TestEntityState
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")

      const fiber = yield* client.NeverStreamVolatile().pipe(Stream.runDrain, Effect.fork)
      yield* TestClock.adjust(1)

      MutableRef.set(state.defectTrigger, true)
      yield* client.GetUser({ id: 123 })
      yield* TestClock.adjust(1)

      const exit = fiber.unsafePoll()
      assert(exit && Exit.isInterrupted(exit))
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(3))
    }).pipe(Effect.provide(TestSharding)))

  it.effect("interrupts a non-persisted stream that defects instead of replaying it", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* TestEntityState
      const makeClient = yield* TestEntity.client
      const client = makeClient("1")

      MutableRef.set(state.defectTrigger, true)
      const fiber = yield* client.NeverStreamVolatile().pipe(Stream.runDrain, Effect.fork)
      yield* TestClock.adjust(1000)

      const exit = fiber.unsafePoll()
      assert(exit && Exit.isInterrupted(exit))
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(1))
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

  it.effect("delivers client interrupts during graceful shard reassignment", () =>
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
        const entityState = yield* TestEntityState
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

        yield* Effect.fork(Fiber.interrupt(entityFiber))
        yield* TestClock.adjust(100)
        assert.deepStrictEqual(entityState.interrupts.unsafeSize(), Option.some(1))
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

  it.effect("does not register an entity built after its shard was released", () =>
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

        entityState.buildLatch.unsafeClose()
        const entityFiber = yield* client.GetUserVolatile({ id: 1 }).pipe(Effect.fork)
        while (entityState.layerBuilds.current === 0) {
          yield* TestClock.adjust(1)
        }

        storageState.assignSelf = false
        while (storageState.releaseCalls.length === 0) {
          yield* TestClock.adjust(10)
        }
        assert.isFalse(sharding.hasShardId(shardId))

        entityState.buildLatch.unsafeOpen()
        yield* TestClock.adjust(10)

        assert.strictEqual(yield* sharding.activeEntityCount, 0)
        assert.deepStrictEqual(entityState.envelopes.unsafeSize(), Option.some(0))
        assert.isNull(entityFiber.unsafePoll())
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

describe("Sharding graceful shutdown", () => {
  it.scoped("hands shards off before the final releaseAll", () => {
    const storage = makeHandoffStorage()
    return Effect.gen(function*() {
      const a = yield* makeHandoffRunner(1, storage)
      const b = yield* makeHandoffRunner(2, storage)
      yield* waitFor(() => a.ownedShards() > 0 && b.ownedShards() > 0)
      const shardId = yield* a.startEntity

      storage.releaseAllLatch.unsafeClose()
      const closing = yield* Effect.fork(Scope.close(a.scope, Exit.void))
      yield* waitFor(() => b.ownedShards() === handoffShards)

      assert.strictEqual(b.ownedShards(), handoffShards)
      assert.isNull(closing.unsafePoll())
      assert.deepStrictEqual(storage.shardEvents(shardId), ["teardown", "release"])

      yield* storage.releaseAllLatch.open
      yield* waitFor(() => closing.unsafePoll() !== null)
      yield* Fiber.join(closing)
    }).pipe(Effect.ensuring(storage.releaseAllLatch.open))
  }, 20_000)

  it.scoped("waits for entity teardown before releasing its shard when the scope closes", () =>
    Effect.gen(function*() {
      const storage = makeHandoffStorage()
      const registrationScope = yield* makeOwnedScope
      const a = yield* makeHandoffRunner(1, storage, { shardLockRefreshInterval: 1000 })
      const gate = yield* makeGate
      yield* waitFor(() => a.ownedShards() === handoffShards)
      const shardId = yield* activateGatedEntity(a, registrationScope, gate, storage, "1")

      yield* expectCloseWaitsForGate(storage, a, gate, shardId)
    }), 20_000)

  it.scoped(
    "waits for singleton teardown before releasing its shard when the scope closes",
    () =>
      Effect.gen(function*() {
        const storage = makeHandoffStorage()
        const registrationScope = yield* makeOwnedScope
        const a = yield* makeHandoffRunner(1, storage, { shardLockRefreshInterval: 1000 })
        const gate = yield* makeGate
        yield* waitFor(() => a.ownedShards() === handoffShards)
        const started = Effect.unsafeMakeLatch()
        const shardId = a.sharding.getShardId(EntityId.make("GatedSingleton"), "default").toString()
        yield* a.sharding.registerSingleton(
          "GatedSingleton",
          Effect.andThen(started.open, Effect.addFinalizer(() => gatedTeardown(storage, gate, shardId)))
        ).pipe(Effect.provideService(Scope.Scope, registrationScope))
        yield* started.await

        yield* expectCloseWaitsForGate(storage, a, gate, shardId)
      }),
    20_000
  )

  it.scoped(
    "waits for a closing singleton registration's teardown before releasing its shard",
    () =>
      Effect.gen(function*() {
        const storage = makeHandoffStorage()
        const registrationScope = yield* makeOwnedScope
        const a = yield* makeHandoffRunner(1, storage, { shardLockRefreshInterval: 1000 })
        const gate = yield* makeGate
        yield* waitFor(() => a.ownedShards() === handoffShards)
        const started = Effect.unsafeMakeLatch()
        const stopping = Effect.unsafeMakeLatch()
        const shardId = a.sharding.getShardId(EntityId.make("ClosingSingleton"), "default").toString()
        yield* a.sharding.registerSingleton(
          "ClosingSingleton",
          Effect.andThen(
            started.open,
            Effect.addFinalizer(() => Effect.andThen(stopping.open, gatedTeardown(storage, gate, shardId)))
          )
        ).pipe(Effect.provideService(Scope.Scope, registrationScope))
        yield* started.await

        // the registration closes first, and its teardown is still running when
        // the Sharding scope closes
        yield* Effect.forkDaemon(Scope.close(registrationScope, Exit.void))
        yield* stopping.await
        yield* expectCloseWaitsForGate(storage, a, gate, shardId)
      }),
    20_000
  )

  it.scoped(
    "closes a singleton registration whose singleton registered another singleton",
    () =>
      Effect.gen(function*() {
        const storage = makeHandoffStorage()
        const a = yield* makeHandoffRunner(1, storage)
        yield* waitFor(() => a.ownedShards() === handoffShards)
        const registrationScope = yield* Scope.make()
        const childRegistered = Effect.unsafeMakeLatch()
        yield* a.sharding.registerSingleton(
          "ParentSingleton",
          Effect.andThen(a.sharding.registerSingleton("ChildSingleton", Effect.never), childRegistered.open)
        ).pipe(Effect.provideService(Scope.Scope, registrationScope))
        yield* childRegistered.await

        // detached, so a deadlocked teardown cannot hang the test
        const closing = yield* Effect.forkDaemon(Scope.close(registrationScope, Exit.void))
        yield* waitFor(() => closing.unsafePoll() !== null)
        assert.isNotNull(closing.unsafePoll(), "closing the parent registration deadlocked")
      }),
    20_000
  )

  it.scoped("stops acquiring shards once shutdown starts", () =>
    Effect.gen(function*() {
      const storage = makeHandoffStorage()
      const [heldShard, ...peerShards] = handoffShardIds
      const peer = RunnerAddress.make("localhost", 3)
      storage.lockShards(peer, peerShards)
      const registrationScope = yield* makeOwnedScope
      // keep this runner's assignments unchanged once it unregisters
      const a = yield* makeHandoffRunner(1, storage, {
        shardLockRefreshInterval: 1000,
        refreshAssignmentsInterval: 60_000
      })
      const gate = yield* makeGate
      yield* waitFor(() => a.sharding.hasShardId(heldShard))
      let entityId = 0
      while (a.sharding.getShardId(EntityId.make(String(entityId)), "default").id !== heldShard.id) {
        entityId++
      }
      yield* activateGatedEntity(a, registrationScope, gate, storage, String(entityId))

      // closing the entity's registration scope starts shutdown, then waits
      // for the entity's teardown
      yield* Effect.forkDaemon(Scope.close(registrationScope, Exit.void))
      yield* waitFor(() => !storage.isRegistered(a.address))
      assert.isFalse(storage.isRegistered(a.address))

      // the peer releases its shards while this runner is shutting down
      const acquireCount = storage.acquireCount()
      storage.unlockAll(peer)
      yield* TestClock.adjust(3000)
      assert.strictEqual(storage.acquireCount(), acquireCount)
    }), 20_000)

  it.scoped("releases locks from an acquisition in flight when shutdown starts", () => {
    const storage = makeHandoffStorage()
    return Effect.gen(function*() {
      storage.acquireLatch.unsafeClose()
      // a long lock interval, so the acquisition cannot time out, and unchanged
      // assignments once the runner unregisters, so only the handoff releases
      const a = yield* makeHandoffRunner(1, storage, {
        shardLockRefreshInterval: 10_000,
        refreshAssignmentsInterval: 60_000
      })
      yield* yieldUntil(() => storage.acquireCount() > 0)
      assert.strictEqual(storage.acquireCount(), 1)

      storage.releaseAllLatch.unsafeClose()
      const closing = yield* Effect.fork(Scope.close(a.scope, Exit.void))
      yield* yieldUntil(() => !storage.isRegistered(a.address))
      assert.isFalse(storage.isRegistered(a.address))
      yield* storage.acquireLatch.open

      const released = () =>
        handoffShardIds.every((shardId) => storage.shardEvents(shardId.toString()).includes("release"))
      // without the clock, so the release cannot wait out the post-acquire sleep
      yield* yieldUntil(released)
      assert.isTrue(released(), "the acquired locks were not released individually")
      assert.isNull(closing.unsafePoll())
      assert.strictEqual(storage.acquireCount(), 1)

      yield* storage.releaseAllLatch.open
      yield* waitFor(() => closing.unsafePoll() !== null)
      assert.isNotNull(closing.unsafePoll(), "scope close did not complete")
    }).pipe(Effect.ensuring(Effect.andThen(storage.acquireLatch.open, storage.releaseAllLatch.open)))
  }, 20_000)

  it.scoped("waits for a shard release already running when shutdown starts", () =>
    Effect.gen(function*() {
      const storage = makeHandoffStorage()
      const registrationScope = yield* makeOwnedScope
      const a = yield* makeHandoffRunner(1, storage, { shardLockRefreshInterval: 1000 })
      const gate = yield* makeGate
      yield* waitFor(() => a.ownedShards() === handoffShards)
      const shardId = yield* activateGatedEntity(a, registrationScope, gate, storage, "1")

      // a peer takes the lock, so the next refresh starts an ordinary release
      // of the shard, held open by the entity's teardown
      storage.lockShards(RunnerAddress.make("localhost", 3), [a.sharding.getShardId(EntityId.make("1"), "default")])
      yield* waitFor(() => a.ownedShards() === handoffShards - 1)
      assert.strictEqual(a.ownedShards(), handoffShards - 1)

      const closing = yield* Effect.fork(Scope.close(a.scope, Exit.void))
      yield* TestClock.adjust(100)
      assert.isNull(closing.unsafePoll())
      assert.strictEqual(storage.releaseCalls(shardId), 0)
      assert.strictEqual(storage.releaseAllCount(), 0)
      for (const other of handoffShardIds) {
        if (other.toString() === shardId) continue
        assert.deepStrictEqual(storage.shardEvents(other.toString()), ["release"])
      }

      yield* gate.open
      yield* waitFor(() => closing.unsafePoll() !== null)
      assert.isNotNull(closing.unsafePoll(), "scope close did not complete")
      assert.strictEqual(storage.releaseCalls(shardId), 1)
      assert.deepStrictEqual(storage.shardEvents(shardId), ["teardown"])
    }), 20_000)

  it.scoped("scope close finishes while lock storage is unhealthy", () => {
    const storage = makeHandoffStorage()
    return Effect.gen(function*() {
      const a = yield* makeHandoffRunner(1, storage)
      yield* waitFor(() => a.ownedShards() === handoffShards)

      storage.refreshLatch.unsafeClose()
      yield* waitFor(() => a.ownedShards() === 0)
      assert.strictEqual(a.ownedShards(), 0)
      const acquireCount = storage.acquireCount()

      // layer teardown closes scopes uninterruptibly
      const closing = yield* Effect.fork(Effect.uninterruptible(Scope.close(a.scope, Exit.void)))
      yield* waitFor(() => closing.unsafePoll() !== null)
      assert.isNotNull(closing.unsafePoll(), "scope close did not complete")
      assert.strictEqual(storage.acquireCount(), acquireCount)
    }).pipe(Effect.ensuring(storage.refreshLatch.open))
  }, 20_000)

  it.scoped("interrupts an entity whose id is also active on a shard that was interrupted first", () =>
    Effect.gen(function*() {
      const run = Rpc.make("run")
      const entity = Entity.make("DuplicateEntityId", [run])
      const sharding = yield* Sharding.Sharding
      let stopped = 0
      const manager = yield* EntityManager.make(
        entity,
        Effect.as(
          Effect.addFinalizer(() =>
            Effect.sync(() => {
              stopped++
            })
          ),
          entity.of({ run: () => Effect.void })
        ),
        {
          // both shards belong to this runner
          sharding: { ...sharding, hasShardId: () => true },
          storage: MessageStorage.noop,
          runnerAddress: RunnerAddress.make("localhost", 1234),
          maxIdleTime: Infinity
        }
      ).pipe(Effect.provide([EntityReaper.Default, TestShardingConfig, Snowflake.layerGenerator]))
      const entityId = EntityId.make("duplicate")
      const activate = Effect.fnUntraced(function*(shardId: ShardId.ShardId) {
        yield* manager.sendLocal(
          new Message.IncomingRequestLocal<typeof run>({
            envelope: Envelope.makeRequest<typeof run>({
              requestId: yield* sharding.getSnowflake,
              address: EntityAddress.make({ shardId, entityType: EntityType.EntityType.make(entity.type), entityId }),
              tag: "run",
              payload: undefined,
              headers: Headers.empty
            }),
            lastSentReply: Option.none(),
            respond: () => Effect.void
          })
        )
      })
      const defaultShard = ShardIdModule.make("default", 1)
      const workflowShard = ShardIdModule.make("workflow", 1)
      yield* TestClock.adjust(1)
      yield* activate(defaultShard)
      yield* activate(workflowShard)
      yield* TestClock.adjust(1)

      const interruptWorkflow = yield* Effect.fork(manager.interruptShards([workflowShard]))
      yield* TestClock.adjust(1000)
      const workflowExit = interruptWorkflow.unsafePoll()
      assert(workflowExit && Exit.isSuccess(workflowExit), "interrupting the workflow shard did not complete")
      assert.strictEqual(stopped, 1)
      const interruptDefault = yield* Effect.fork(manager.interruptShards([defaultShard]))
      yield* TestClock.adjust(1000)
      const defaultExit = interruptDefault.unsafePoll()
      assert(defaultExit && Exit.isSuccess(defaultExit), "interrupting the default shard did not complete")
      assert.strictEqual(stopped, 2)
    }).pipe(Effect.provide(TestSharding)))
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

const handoffShards = 4
const handoffShardIds = Array.makeBy(handoffShards, (i) => ShardIdModule.make("default", i + 1))

const HandoffEntity = Entity.make("HandoffEntity", [
  Rpc.make("Ping").annotate(ClusterSchema.Persisted, false)
])

const GatedTeardownEntity = Entity.make("GatedTeardownEntity", [
  Rpc.make("Activate").annotate(ClusterSchema.Persisted, false)
])

// advances without the clock, so pending timeouts cannot fire
const yieldUntil = (predicate: () => boolean) =>
  Effect.gen(function*() {
    for (let i = 0; i < 100 && !predicate(); i++) {
      yield* Effect.yieldNow()
    }
  })

const waitFor = (predicate: () => boolean) =>
  Effect.gen(function*() {
    for (let i = 0; i < 30 && !predicate(); i++) {
      yield* TestClock.adjust(100)
    }
  })

// closed when the test ends, even if an assertion fails
const makeOwnedScope = Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

// opened when the test ends, so a failing test does not hang closing its scopes
const makeGate = Effect.acquireRelease(Effect.sync(() => Effect.unsafeMakeLatch()), (gate) => gate.open)

const gatedTeardown = (storage: HandoffStorage, gate: Effect.Latch, shardId: string) =>
  Effect.andThen(gate.await, Effect.sync(() => storage.events.push(["teardown", shardId])))

// Registers an entity whose teardown waits for `gate`, in `scope`, and
// activates `entityId`. Returns the entity's shard.
const activateGatedEntity = Effect.fnUntraced(function*(
  runner: HandoffRunner,
  scope: Scope.Scope,
  gate: Effect.Latch,
  storage: HandoffStorage,
  entityId: string
) {
  yield* runner.sharding.registerEntity(
    GatedTeardownEntity,
    Effect.gen(function*() {
      const address = yield* Entity.CurrentAddress
      yield* Effect.addFinalizer(() => gatedTeardown(storage, gate, address.shardId.toString()))
      return { Activate: () => Effect.void }
    })
  ).pipe(Effect.provideService(Scope.Scope, scope))
  const makeClient = yield* GatedTeardownEntity.client.pipe(Effect.provide(runner.context))
  yield* makeClient(entityId).Activate()
  return runner.sharding.getShardId(EntityId.make(entityId), "default").toString()
})

// Closes the runner while `gate` holds a teardown on `shardId`. The shard must
// not be released, nor `releaseAll` run, until the gate opens.
const expectCloseWaitsForGate = Effect.fnUntraced(function*(
  storage: HandoffStorage,
  runner: HandoffRunner,
  gate: Effect.Latch,
  shardId: string
) {
  const closing = yield* Effect.fork(Scope.close(runner.scope, Exit.void))
  yield* TestClock.adjust(100)
  assert.isNull(closing.unsafePoll())
  assert.deepStrictEqual(storage.shardEvents(shardId), [])
  assert.strictEqual(storage.releaseAllCount(), 0)

  yield* gate.open
  yield* waitFor(() => closing.unsafePoll() !== null)
  assert.isNotNull(closing.unsafePoll(), "scope close did not complete")
  assert.deepStrictEqual(storage.shardEvents(shardId), ["teardown", "release"])
})

type HandoffStorage = ReturnType<typeof makeHandoffStorage>

const makeHandoffStorage = () => {
  const runners = new Map<number, Runner.Runner>()
  const locks = new Map<string, RunnerAddress.RunnerAddress>()
  const events: Array<readonly [event: "teardown" | "release" | "releaseAll", shardId: string]> = []
  const releaseAllLatch = Effect.unsafeMakeLatch(true)
  const refreshLatch = Effect.unsafeMakeLatch(true)
  const acquireLatch = Effect.unsafeMakeLatch(true)
  const releaseCalls: Array<string> = []
  let acquireCount = 0
  let releaseAllCount = 0
  let machineId = 0
  const releaseLock = (address: RunnerAddress.RunnerAddress, shardId: string, event: "release" | "releaseAll") => {
    if (!Equal.equals(locks.get(shardId), address)) return
    locks.delete(shardId)
    events.push([event, shardId])
  }
  return {
    events,
    releaseAllLatch,
    refreshLatch,
    acquireLatch,
    acquireCount: () => acquireCount,
    releaseCalls: (shardId: string) => releaseCalls.filter((id) => id === shardId).length,
    releaseAllCount: () => releaseAllCount,
    isRegistered: (address: RunnerAddress.RunnerAddress) => runners.has(address.port),
    lockShards: (address: RunnerAddress.RunnerAddress, shardIds: ReadonlyArray<ShardId.ShardId>) => {
      for (const shardId of shardIds) locks.set(shardId.toString(), address)
    },
    unlockAll: (address: RunnerAddress.RunnerAddress) => {
      for (const [shardId, owner] of locks) {
        if (Equal.equals(owner, address)) locks.delete(shardId)
      }
    },
    lockCount: (address: RunnerAddress.RunnerAddress) =>
      globalThis.Array.from(locks.values()).filter((owner) => Equal.equals(owner, address)).length,
    shardEvents: (shardId: string) => events.filter((event) => event[1] === shardId).map((event) => event[0]),
    runnerStorage: RunnerStorage.RunnerStorage.of({
      register: (runner) =>
        Effect.sync(() => {
          runners.set(runner.address.port, runner)
          return MachineId.make(++machineId)
        }),
      unregister: (address) =>
        Effect.sync(() => {
          runners.delete(address.port)
        }),
      getRunners: Effect.sync(() => globalThis.Array.from(runners.values(), (runner) => [runner, true] as const)),
      setRunnerHealth: () => Effect.void,
      acquire: (address, shardIds) =>
        Effect.suspend(() => {
          acquireCount++
          return acquireLatch.whenOpen(Effect.sync(() =>
            globalThis.Array.from(shardIds).filter((shardId) => {
              const owner = locks.get(shardId.toString())
              if (owner && !Equal.equals(owner, address)) return false
              locks.set(shardId.toString(), address)
              return true
            })
          ))
        }),
      refresh: (address, shardIds) =>
        refreshLatch.whenOpen(
          Effect.sync(() =>
            globalThis.Array.from(shardIds).filter((shardId) => Equal.equals(locks.get(shardId.toString()), address))
          )
        ),
      release: (address, shardId) =>
        Effect.sync(() => {
          releaseCalls.push(shardId.toString())
          releaseLock(address, shardId.toString(), "release")
        }),
      releaseAll: (address) =>
        releaseAllLatch.whenOpen(Effect.sync(() => {
          releaseAllCount++
          for (const shardId of locks.keys()) releaseLock(address, shardId, "releaseAll")
        }))
    })
  }
}

type HandoffRunner = Effect.Effect.Success<ReturnType<typeof makeHandoffRunner>>

const makeHandoffRunner = Effect.fnUntraced(function*(
  port: number,
  storage: HandoffStorage,
  config?: {
    readonly shardLockRefreshInterval?: number
    readonly refreshAssignmentsInterval?: number
  }
) {
  const address = RunnerAddress.make("localhost", port)
  const scope = yield* Scope.make()
  // detached, so a hung shutdown fails the test instead of hanging it
  const close = Effect.gen(function*() {
    const fiber = yield* Effect.forkDaemon(Scope.close(scope, Exit.void))
    yield* waitFor(() => fiber.unsafePoll() !== null)
    if (fiber.unsafePoll() === null) {
      return yield* Effect.dieMessage(`runner ${port} did not close`)
    }
  })
  yield* Effect.addFinalizer(() => close)
  const context = yield* HandoffEntity.toLayer(Effect.gen(function*() {
    const entityAddress = yield* Entity.CurrentAddress
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => storage.events.push(["teardown", entityAddress.shardId.toString()]))
    )
    return { Ping: () => Effect.void }
  })).pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(Layer.succeed(RunnerStorage.RunnerStorage, storage.runnerStorage)),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(Runners.layerNoop),
    Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
    Layer.provide(ShardingConfig.layer({
      runnerAddress: Option.some(address),
      shardsPerGroup: handoffShards,
      entityTerminationTimeout: 0,
      entityMessagePollInterval: 50,
      refreshAssignmentsInterval: config?.refreshAssignmentsInterval ?? 50,
      shardLockRefreshInterval: config?.shardLockRefreshInterval ?? 100
    })),
    Layer.buildWithScope(scope)
  )
  const sharding = Context.get(context, Sharding.Sharding)
  const startEntity = Effect.gen(function*() {
    let entityId = 0
    while (!sharding.hasShardId(sharding.getShardId(EntityId.make(String(entityId)), "default"))) {
      entityId++
    }
    const makeClient = yield* HandoffEntity.client
    yield* makeClient(String(entityId)).Ping()
    return sharding.getShardId(EntityId.make(String(entityId)), "default").toString()
  }).pipe(Effect.provide(context))
  return {
    address,
    context,
    sharding,
    scope,
    close,
    startEntity,
    ownedShards: () => handoffShardIds.filter((shardId) => sharding.hasShardId(shardId)).length
  }
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
