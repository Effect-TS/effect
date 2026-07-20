import { assert, describe, it } from "@effect/vitest"
import { type Duration, Effect, Exit, Fiber, Latch, Layer, Option, Schema } from "effect"
import { TestClock } from "effect/testing"
import {
  ClusterError,
  ClusterMachine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/unstable/cluster"
import { Machine } from "effect/unstable/machine"

class Count extends Schema.TaggedClass<Count>("Count")("Count", {
  value: Schema.NumberFromString
}) {}

class Done extends Schema.TaggedClass<Done>("Done")("Done", {
  value: Schema.NumberFromString
}) {}

class Increment extends Schema.TaggedClass<Increment>("Increment")("Increment", {
  by: Schema.Number,
  block: Schema.Boolean
}) {}

class Fail extends Schema.TaggedClass<Fail>("Fail")("Fail", {}) {}
class Finish extends Schema.TaggedClass<Finish>("Finish")("Finish", {}) {}
class RaiseFromAction extends Schema.TaggedClass<RaiseFromAction>("RaiseFromAction")("RaiseFromAction", {}) {}
class SpawnFromAction extends Schema.TaggedClass<SpawnFromAction>("SpawnFromAction")("SpawnFromAction", {}) {}

class Changed extends Schema.TaggedClass<Changed>("Changed")("Changed", {
  value: Schema.Number
}) {}

const CounterStates = Machine.defineStates({ Count, Done })

const makeCounter = (state: {
  readonly gate: Latch.Latch
  initialEntries: number
  actions: number
  inFlight: number
  maxInFlight: number
}) =>
  Machine.make({
    id: "Counter",
    states: CounterStates.states,
    events: [Increment, Fail, Finish, RaiseFromAction, SpawnFromAction],
    emits: [Changed],
    initial: () => CounterStates.initial.Count(new Count({ value: 0 }))
  }).handle({
    Count: {
      entry: () =>
        Machine.action(Effect.sync(() => {
          state.initialEntries += 1
        })),
      on: {
        Increment: Effect.fn(function*({ emit, event, state: current }) {
          yield* Machine.action(Effect.gen(function*() {
            state.actions += 1
            state.inFlight += 1
            state.maxInFlight = Math.max(state.maxInFlight, state.inFlight)
            if (event.block) {
              yield* state.gate.await
            }
            state.inFlight -= 1
          }))
          const value = current.value + event.by
          yield* emit(new Changed({ value }))
          return CounterStates.initial.Count(new Count({ value }))
        }),
        Fail: Effect.fn(function*({ emit, state: current }) {
          yield* emit(new Changed({ value: 999 }))
          yield* Machine.action(Effect.fail("action failed"))
          return CounterStates.initial.Count(current)
        }),
        Finish: ({ state: current }) => CounterStates.initial.Done(new Done({ value: current.value })),
        RaiseFromAction: Effect.fn(function*({ state: current }) {
          yield* Machine.action(
            Machine.runtime<{
              readonly events: Increment | Fail | Finish | RaiseFromAction | SpawnFromAction
              readonly emits: Changed
            }>().pipe(
              Effect.flatMap((runtime) => runtime.raise(new Increment({ by: 1, block: false })))
            )
          )
          return CounterStates.initial.Count(current)
        }),
        SpawnFromAction: Effect.fn(function*({ state: current }) {
          yield* Machine.action(Machine.spawn(Machine.effect(Effect.void)).pipe(Effect.asVoid))
          return CounterStates.initial.Count(current)
        })
      }
    },
    Done: {
      type: "final"
    }
  })

const storageKey = (entityType: string, entityId: string): string => `${entityType}\u0000${entityId}`

const makeTestStorage = () => {
  const entries = new Map<string, ClusterMachine.Checkpoint>()
  const requests = new Map<string, Set<Snowflake.Snowflake>>()
  const transactionFlags: Array<boolean> = []
  let commits = 0
  let loads = 0
  let failNextCommit = false

  const service = ClusterMachine.Storage.of({
    load: (address, requestId) =>
      MessageStorage.MemoryTransaction.use((inTransaction) =>
        Effect.sync(() => {
          loads += 1
          transactionFlags.push(inTransaction)
          const key = storageKey(address.entityType, address.entityId)
          return {
            checkpoint: Option.fromNullishOr(entries.get(key)),
            processed: requests.get(key)?.has(requestId) ?? false
          }
        })
      ),
    commit: (address, checkpoint) =>
      MessageStorage.MemoryTransaction.use((inTransaction) =>
        Effect.sync(() => {
          transactionFlags.push(inTransaction)
          if (failNextCommit) {
            failNextCommit = false
            throw new Error("checkpoint unavailable")
          }
          const key = storageKey(address.entityType, address.entityId)
          let processed = requests.get(key)
          if (processed === undefined) {
            processed = new Set()
            requests.set(key, processed)
          }
          if (processed.has(checkpoint.requestId)) {
            return ClusterMachine.CommitResult.Duplicate()
          }
          processed.add(checkpoint.requestId)
          entries.set(key, checkpoint)
          commits += 1
          return ClusterMachine.CommitResult.Committed()
        }).pipe(ClusterError.PersistenceError.refail)
      )
  })

  return {
    service,
    entries,
    requests,
    transactionFlags,
    get commits() {
      return commits
    },
    get loads() {
      return loads
    },
    snapshot() {
      return {
        entries: new Map(entries),
        requests: new Map(Array.from(requests, ([key, value]) => [key, new Set(value)])),
        commits
      }
    },
    restore(snapshot: {
      readonly entries: Map<string, ClusterMachine.Checkpoint>
      readonly requests: Map<string, Set<Snowflake.Snowflake>>
      readonly commits: number
    }) {
      entries.clear()
      for (const [key, value] of snapshot.entries) entries.set(key, value)
      requests.clear()
      for (const [key, value] of snapshot.requests) requests.set(key, value)
      commits = snapshot.commits
    },
    failNextCommit() {
      failNextCommit = true
    }
  }
}

const config = (entityMaxIdleTime: Duration.Input = "10 minutes") =>
  ShardingConfig.layer({
    entityMailboxCapacity: 10,
    entityMaxIdleTime,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 5000,
    sendRetryInterval: 100,
    refreshAssignmentsInterval: 0
  })

const makeLayer = (
  bridge: ClusterMachine.ClusterMachine<any, any, never>,
  storage: ClusterMachine.Storage["Service"],
  enqueue?: (event: any) => Effect.Effect<void, unknown>,
  entityMaxIdleTime?: Duration.Input,
  withTransaction?: MessageStorage.MessageStorage["Service"]["withTransaction"]
) => {
  const messageStorageLayer = withTransaction === undefined ?
    MessageStorage.layerMemory :
    Layer.effect(
      MessageStorage.MessageStorage,
      Effect.map(MessageStorage.MemoryDriver, (driver) =>
        MessageStorage.MessageStorage.of({
          ...driver.storage,
          withTransaction
        }))
    ).pipe(Layer.provideMerge(MessageStorage.MemoryDriver.layer))

  return bridge.toLayer(enqueue === undefined ? undefined : { enqueue }).pipe(
    Layer.provide(Layer.succeed(ClusterMachine.Storage, storage)),
    Layer.provideMerge(Sharding.layer),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(messageStorageLayer),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(config(entityMaxIdleTime))
  )
}

const assertAccepted = (result: ClusterMachine.Accepted | ClusterMachine.Rejected) => {
  assert.instanceOf(result, ClusterMachine.Accepted)
}

const assertRejected = (
  result: ClusterMachine.Accepted | ClusterMachine.Rejected,
  reason: ClusterMachine.RejectionReason
) => {
  assert.instanceOf(result, ClusterMachine.Rejected)
  assert.strictEqual(result.reason, reason)
}

describe("ClusterMachine", () => {
  it.effect("initializes, persists transformed state, and restores after passivation", () =>
    Effect.gen(function*() {
      const gate = yield* Latch.make()
      const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
      const machine = makeCounter(state)
      const bridge = ClusterMachine.make("CounterEntity", machine, { version: "1" })
      const storage = makeTestStorage()
      const emitted: Array<Changed> = []
      const emissionTransactions: Array<boolean> = []
      const layer = makeLayer(
        bridge,
        storage.service,
        (event) =>
          MessageStorage.MemoryTransaction.use((inTransaction) =>
            Effect.sync(() => {
              emissionTransactions.push(inTransaction)
              emitted.push(event)
            })
          ),
        0
      )

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* bridge.entity.client
        const client = makeClient("counter-1")

        assertAccepted(yield* client.send(new Increment({ by: 2, block: false })))
        assert.strictEqual(state.initialEntries, 1)
        assert.strictEqual(state.actions, 1)
        assert.deepStrictEqual(emitted, [new Changed({ value: 2 })])
        assert.deepStrictEqual(storage.entries.get(storageKey("CounterEntity", "counter-1"))?.snapshot, {
          _tag: "MachineSnapshot",
          active: [{ path: "Count", value: { _tag: "Count", value: "2" } }]
        })

        yield* TestClock.adjust(5000)
        yield* Effect.yieldNow
        assert.strictEqual(yield* Sharding.Sharding.pipe(Effect.flatMap((sharding) => sharding.activeEntityCount)), 0)

        assertAccepted(yield* client.send(new Increment({ by: 3, block: false })))
        assert.strictEqual(state.initialEntries, 1)
        assert.strictEqual(state.actions, 2)
        assert.deepStrictEqual(storage.entries.get(storageKey("CounterEntity", "counter-1"))?.snapshot.active, [{
          path: "Count",
          value: { _tag: "Count", value: "5" }
        }])
        assert.isTrue(storage.transactionFlags.every(Boolean))
        assert.isTrue(emissionTransactions.every(Boolean))
      }).pipe(Effect.provide(layer))
    }))

  it.effect("serializes events for one entity", () =>
    Effect.gen(function*() {
      const gate = yield* Latch.make()
      const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
      const bridge = ClusterMachine.make("SerializedCounter", makeCounter(state), { version: "1" })
      const storage = makeTestStorage()

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* bridge.entity.client
        const client = makeClient("counter-1")
        const first = yield* client.send(new Increment({ by: 1, block: true })).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* Effect.yieldNow
        const second = yield* client.send(new Increment({ by: 1, block: false })).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* Effect.yieldNow

        assert.strictEqual(state.inFlight, 1)
        assert.strictEqual(state.maxInFlight, 1)
        yield* gate.open
        assertAccepted(yield* Fiber.join(first))
        assertAccepted(yield* Fiber.join(second))
        assert.strictEqual(state.maxInFlight, 1)
        assert.strictEqual(state.actions, 2)
        assert.deepStrictEqual(storage.entries.get(storageKey("SerializedCounter", "counter-1"))?.snapshot.active, [{
          path: "Count",
          value: { _tag: "Count", value: "2" }
        }])
      }).pipe(Effect.provide(makeLayer(bridge, storage.service, () => Effect.void)))
    }))

  it.effect("retains the previous checkpoint and suppresses emissions when an action fails", () =>
    Effect.gen(function*() {
      const gate = yield* Latch.make()
      const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
      const bridge = ClusterMachine.make("FailingCounter", makeCounter(state), { version: "1" })
      const storage = makeTestStorage()
      const emitted: Array<Changed> = []

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* bridge.entity.client
        const client = makeClient("counter-1")
        assertAccepted(yield* client.send(new Increment({ by: 1, block: false })))
        const previous = storage.entries.get(storageKey("FailingCounter", "counter-1"))

        assertRejected(yield* client.send(new Fail({})), "TransitionFailure")
        assert.strictEqual(storage.entries.get(storageKey("FailingCounter", "counter-1")), previous)
        assert.strictEqual(storage.commits, 1)
        assert.deepStrictEqual(emitted, [new Changed({ value: 1 })])
      }).pipe(Effect.provide(makeLayer(
        bridge,
        storage.service,
        (event) => Effect.sync(() => emitted.push(event))
      )))
    }))

  it.effect("suppresses emissions when checkpoint persistence fails", () =>
    Effect.gen(function*() {
      const gate = yield* Latch.make()
      const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
      const bridge = ClusterMachine.make("PersistenceFailureCounter", makeCounter(state), { version: "1" })
      const storage = makeTestStorage()
      const emitted: Array<Changed> = []
      storage.failNextCommit()

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* bridge.entity.client
        const client = makeClient("counter-1")

        assertRejected(yield* client.send(new Increment({ by: 1, block: false })), "PersistenceFailure")
        assert.strictEqual(storage.entries.size, 0)
        assert.strictEqual(storage.commits, 0)
        assert.deepStrictEqual(emitted, [])

        assertAccepted(yield* client.send(new Increment({ by: 1, block: false })))
        assert.strictEqual(storage.commits, 1)
        assert.deepStrictEqual(emitted, [new Changed({ value: 1 })])
      }).pipe(Effect.provide(makeLayer(
        bridge,
        storage.service,
        (event) => Effect.sync(() => emitted.push(event))
      )))
    }))

  it.effect("does not apply a redelivered persisted request twice", () =>
    Effect.gen(function*() {
      const gate = yield* Latch.make()
      const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
      const bridge = ClusterMachine.make("DeduplicatedCounter", makeCounter(state), { version: "1" })
      const storage = makeTestStorage()

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const sharding = yield* Sharding.Sharding
        const driver = yield* MessageStorage.MemoryDriver
        const makeClient = yield* bridge.entity.client
        const client = makeClient("counter-1")
        assertAccepted(yield* client.send(new Increment({ by: 1, block: false })))
        const requestId = Snowflake.Snowflake(driver.journal[0].requestId)
        const key = storageKey("DeduplicatedCounter", "counter-1")
        storage.entries.set(key, {
          ...storage.entries.get(key)!,
          version: "previous-deployment"
        })

        assert.isTrue(yield* sharding.reset(requestId))
        yield* sharding.pollStorage
        yield* TestClock.adjust(1)
        yield* Effect.yieldNow.pipe(
          Effect.repeat({ until: () => storage.loads >= 2 })
        )

        assert.isAtLeast(storage.loads, 2)
        assert.strictEqual(state.actions, 1)
        assert.strictEqual(storage.commits, 1)
        assert.deepStrictEqual(storage.entries.get(key)?.snapshot.active, [{
          path: "Count",
          value: { _tag: "Count", value: "1" }
        }])
        const reply = driver.requests.get(String(requestId))!.replies[0]
        assert(
          reply._tag === "WithExit" && reply.exit._tag === "Success" &&
            (reply.exit.value as { readonly _tag: string })._tag === "Accepted"
        )
      }).pipe(Effect.provide(makeLayer(bridge, storage.service, () => Effect.void)))
    }))

  it.effect("rolls back a checkpoint and partial outbox when enqueue fails", () =>
    Effect.gen(function*() {
      const gate = yield* Latch.make()
      const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
      const bridge = ClusterMachine.make("EmissionFailureCounter", makeCounter(state), { version: "1" })
      const storage = makeTestStorage()
      const emitted: Array<Changed> = []
      const withTransaction: MessageStorage.MessageStorage["Service"]["withTransaction"] = (effect) => {
        const checkpoint = storage.snapshot()
        const emittedLength = emitted.length
        return Effect.onExit(
          Effect.provideService(effect, MessageStorage.MemoryTransaction, true),
          (exit) =>
            Exit.isFailure(exit)
              ? Effect.sync(() => {
                storage.restore(checkpoint)
                emitted.length = emittedLength
              })
              : Effect.void
        )
      }

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* bridge.entity.client
        const result = yield* makeClient("counter-1").send(new Increment({ by: 1, block: false }))

        assertRejected(result, "EmissionFailure")
        assert.strictEqual(storage.entries.size, 0)
        assert.strictEqual(storage.commits, 0)
        assert.deepStrictEqual(emitted, [])
      }).pipe(Effect.provide(makeLayer(
        bridge,
        storage.service,
        (event) => Effect.sync(() => emitted.push(event)).pipe(Effect.andThen(Effect.fail("outbox unavailable"))),
        undefined,
        withTransaction
      )))
    }))

  it.effect("keeps historical request ids in the in-memory storage", () =>
    Effect.gen(function*() {
      const storage = yield* ClusterMachine.Storage
      const address = {
        entityType: "MemoryCounter",
        entityId: "counter-1",
        shardId: { group: "default", id: 1 }
      } as any
      const firstId = Snowflake.Snowflake(1)
      const secondId = Snowflake.Snowflake(2)
      const first: ClusterMachine.Checkpoint = {
        machineId: "Counter",
        version: "1",
        requestId: firstId,
        snapshot: { _tag: "MachineSnapshot", active: [{ path: "Count", value: { _tag: "Count", value: "1" } }] }
      }
      const second: ClusterMachine.Checkpoint = {
        ...first,
        requestId: secondId,
        snapshot: { _tag: "MachineSnapshot", active: [{ path: "Count", value: { _tag: "Count", value: "2" } }] }
      }

      assert.deepStrictEqual(yield* storage.commit(address, first), ClusterMachine.CommitResult.Committed())
      assert.deepStrictEqual(yield* storage.commit(address, second), ClusterMachine.CommitResult.Committed())
      assert.deepStrictEqual(yield* storage.commit(address, first), ClusterMachine.CommitResult.Duplicate())
      const loaded = yield* storage.load(address, firstId)
      assert.isTrue(loaded.processed)
      assert.deepStrictEqual(Option.getOrThrow(loaded.checkpoint), second)
    }).pipe(Effect.provide(ClusterMachine.layerMemory)))

  it.effect("rejects incompatible and undecodable checkpoints without resetting", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<{
        readonly entityType: string
        readonly machineId: string
        readonly version: string
        readonly snapshot: Machine.Machine.EncodedSnapshot
        readonly reason: ClusterMachine.RejectionReason
      }> = [
        {
          entityType: "WrongMachineCounter",
          machineId: "Other",
          version: "1",
          snapshot: { _tag: "MachineSnapshot", active: [{ path: "Count", value: { _tag: "Count", value: "0" } }] },
          reason: "MachineIdMismatch"
        },
        {
          entityType: "WrongVersionCounter",
          machineId: "Counter",
          version: "0",
          snapshot: { _tag: "MachineSnapshot", active: [{ path: "Count", value: { _tag: "Count", value: "0" } }] },
          reason: "VersionMismatch"
        },
        {
          entityType: "InvalidSnapshotCounter",
          machineId: "Counter",
          version: "1",
          snapshot: { _tag: "MachineSnapshot", active: [{ path: "Missing", value: {} }] },
          reason: "InvalidCheckpoint"
        }
      ]

      for (const testCase of cases) {
        const gate = yield* Latch.make()
        const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
        const bridge = ClusterMachine.make(testCase.entityType, makeCounter(state), { version: "1" })
        const storage = makeTestStorage()
        const checkpoint = {
          machineId: testCase.machineId,
          version: testCase.version,
          requestId: Snowflake.Snowflake(0),
          snapshot: testCase.snapshot
        }
        storage.entries.set(storageKey(testCase.entityType, "counter-1"), checkpoint)

        yield* Effect.gen(function*() {
          yield* TestClock.adjust(1)
          const makeClient = yield* bridge.entity.client
          assertRejected(
            yield* makeClient("counter-1").send(new Increment({ by: 1, block: false })),
            testCase.reason
          )
          assert.strictEqual(storage.entries.get(storageKey(testCase.entityType, "counter-1")), checkpoint)
          assert.strictEqual(storage.commits, 0)
          assert.strictEqual(state.initialEntries, 0)
        }).pipe(Effect.provide(makeLayer(bridge, storage.service, () => Effect.void)))
      }
    }))

  it.effect("persists final state and treats later events as no-ops", () =>
    Effect.gen(function*() {
      const gate = yield* Latch.make()
      const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
      const bridge = ClusterMachine.make("FinalCounter", makeCounter(state), { version: "1" })
      const storage = makeTestStorage()

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* bridge.entity.client
        const client = makeClient("counter-1")
        assertAccepted(yield* client.send(new Finish({})))
        assert.deepStrictEqual(storage.entries.get(storageKey("FinalCounter", "counter-1"))?.snapshot.active, [{
          path: "Done",
          value: { _tag: "Done", value: "0" }
        }])

        assertAccepted(yield* client.send(new Increment({ by: 10, block: false })))
        assert.strictEqual(state.actions, 0)
        assert.strictEqual(storage.commits, 2)
        assert.deepStrictEqual(storage.entries.get(storageKey("FinalCounter", "counter-1"))?.snapshot.active, [{
          path: "Done",
          value: { _tag: "Done", value: "0" }
        }])
      }).pipe(Effect.provide(makeLayer(bridge, storage.service, () => Effect.void)))
    }))

  it.effect("rejects action-time runtime queues and spawned children", () =>
    Effect.gen(function*() {
      for (const event of [new RaiseFromAction({}), new SpawnFromAction({})]) {
        const gate = yield* Latch.make()
        const state = { gate, initialEntries: 0, actions: 0, inFlight: 0, maxInFlight: 0 }
        const bridge = ClusterMachine.make(`Unsupported${event._tag}`, makeCounter(state), { version: "1" })
        const storage = makeTestStorage()

        yield* Effect.gen(function*() {
          yield* TestClock.adjust(1)
          const makeClient = yield* bridge.entity.client
          assertRejected(yield* makeClient("counter-1").send(event), "UnsupportedProcessLocal")
          assert.strictEqual(storage.commits, 0)
        }).pipe(Effect.provide(makeLayer(bridge, storage.service, () => Effect.void)))
      }
    }))

  it.effect("rejects machines with invoke configurations", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({ Count })
      const invoked = Machine.make({
        id: "Invoked",
        states: states.states,
        events: [Increment],
        initial: () => states.initial.Count(new Count({ value: 0 }))
      }).handle({
        Count: {
          invoke: Machine.invoke({
            id: "child",
            src: () => Machine.effect(Effect.void)
          })
        }
      })
      const bridge = ClusterMachine.make("InvokedCounter", invoked, { version: "1" })
      const storage = makeTestStorage()

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* bridge.entity.client
        assertRejected(
          yield* makeClient("counter-1").send(new Increment({ by: 1, block: false })),
          "UnsupportedProcessLocal"
        )
        assert.strictEqual(storage.commits, 0)
      }).pipe(Effect.provide(makeLayer(bridge, storage.service)))
    }))
})
