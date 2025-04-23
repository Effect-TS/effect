import {
  MessageStorage,
  Runner,
  RunnerAddress,
  RunnerHealth,
  Runners,
  ShardId,
  ShardingConfig,
  ShardManager,
  ShardStorage
} from "@effect/cluster"
import { describe, expect, it } from "@effect/vitest"
import { Array, Data, Effect, Iterable, Layer, MutableHashMap, Option, pipe, TestClock } from "effect"
import {
  decideAssignmentsForUnassignedShards,
  decideAssignmentsForUnbalancedShards,
  RunnerWithMetadata,
  State
} from "../src/internal/shardManager.js"

const runner1 = RunnerWithMetadata({
  runner: Runner.make({ address: RunnerAddress.make("1", 1), version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})
const runner2 = RunnerWithMetadata({
  runner: Runner.make({ address: RunnerAddress.make("2", 2), version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})
const runner3 = RunnerWithMetadata({
  runner: Runner.make({ address: RunnerAddress.make("3", 3), version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})

describe("ShardManager", () => {
  describe("Rebalancing", () => {
    it("should rebalance unbalanced assignments", () => {
      const state = new State(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [ShardId.make(1), Option.some(runner1.runner.address)],
          [ShardId.make(2), Option.some(runner1.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.has(assignments, runner2.runner.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, runner1.runner.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance to runners with an older version", () => {
      const oldRunner2 = RunnerWithMetadata({
        runner: Runner.make({ address: runner2.runner.address, version: 0 }),
        registeredAt: runner2.registeredAt
      })
      const state = new State(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, oldRunner2]
        ),
        new Map([
          [ShardId.make(1), Option.some(runner1.runner.address)],
          [ShardId.make(2), Option.some(runner1.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.size(assignments) === 0).toBe(true)
      expect(MutableHashMap.size(unassignments) === 0).toBe(true)
    })

    it("should not rebalance when already well-balanced", () => {
      const state = new State(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [ShardId.make(1), Option.some(runner1.runner.address)],
          [ShardId.make(2), Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should not rebalance when there is only a one-shard difference", () => {
      const state = new State(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [ShardId.make(1), Option.some(runner1.runner.address)],
          [ShardId.make(2), Option.some(runner1.runner.address)],
          [ShardId.make(3), Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should rebalance when there is more than a one-shard difference", () => {
      const state = new State(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [ShardId.make(1), Option.some(runner1.runner.address)],
          [ShardId.make(2), Option.some(runner1.runner.address)],
          [ShardId.make(3), Option.some(runner1.runner.address)],
          [ShardId.make(4), Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.has(assignments, runner2.runner.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, runner1.runner.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should pick the runner with less shards", () => {
      const state = new State(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2],
          [runner3.runner.address, runner3]
        ),
        new Map([
          [ShardId.make(1), Option.some(runner1.runner.address)],
          [ShardId.make(2), Option.some(runner1.runner.address)],
          [ShardId.make(3), Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.has(assignments, runner3.runner.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, runner1.runner.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance if there are no runners", () => {
      const state = new State(
        MutableHashMap.empty(),
        new Map([
          [ShardId.make(1), Option.some(runner1.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should balance well when many nodes are starting sequentially", () => {
      const shards = Array.makeBy(
        300,
        (i) => [ShardId.make(i + 1), Option.none<RunnerAddress.RunnerAddress>()] as const
      )
      const state = new State(MutableHashMap.empty(), new Map(shards))
      for (let i = 1; i <= 30; i++) {
        const address = RunnerAddress.make(`${i}`, i)
        const runner = RunnerWithMetadata({
          runner: Runner.make({ address, version: 1 }),
          registeredAt: Date.now()
        })
        MutableHashMap.set(state.runners, address, runner)
        const [assignments, unassignments] = state.unassignedShards.length > 0
          ? decideAssignmentsForUnassignedShards(state)
          : decideAssignmentsForUnbalancedShards(state, 1)
        for (const [, shards] of unassignments) {
          for (const shard of shards) {
            state.shards.set(shard, Option.none())
          }
        }
        for (const [address, shards] of assignments) {
          for (const shard of shards) {
            state.shards.set(shard, Option.some(address))
          }
        }
      }
      const shardsPerRunner = state.shardsPerRunner.pipe(
        Array.fromIterable,
        Array.map(([, shards]) => shards.size)
      )
      expect(shardsPerRunner).toHaveLength(30)
      expect(Array.every(shardsPerRunner, (n) => n === 10)).toBe(true)
    })
  })

  describe.concurrent("Simulation", () => {
    const ShardManagerLive = ShardManager.layer.pipe(
      Layer.provide(ShardManager.layerConfig({
        rebalanceDebounce: 0
      }))
    )
    const RunnerHealthLive = RunnerHealth.layer.pipe(
      Layer.provideMerge(Runners.layerNoop)
    )
    const TestLive = ShardManagerLive.pipe(
      Layer.provideMerge(Layer.mergeAll(
        ShardStorage.layerNoop,
        RunnerHealthLive
      )),
      Layer.provide([MessageStorage.layerNoop, ShardingConfig.layer()])
    )

    it.effect("should successfully scale up", () =>
      Effect.gen(function*() {
        const manager = yield* ShardManager.ShardManager

        // Setup 20 runners first
        yield* simulate(Array.range(1, 20).map(registerRunner))
        yield* TestClock.adjust("20 seconds")

        // Check that all runners are assigned and have 15 shards each
        const assignments = yield* manager.getAssignments
        const values = Array.fromIterable(assignments.values())
        const allRunnersAssigned = Array.every(values, Option.isSome)
        expect(allRunnersAssigned).toBe(true)
        const shardsPerRunner = getShardsPerRunner(assignments)
        expect(shardsPerRunner.every((shards) => shards.length === 15))

        // Setup another 5 runners
        yield* simulate(Array.range(21, 25).map(registerRunner))
        yield* TestClock.adjust("20 seconds")

        // Check that each of the new runners received 6 shards
        const assignments2 = yield* manager.getAssignments.pipe(
          Effect.map(Iterable.filter(([, address]) => Option.isSome(address) && address.value.port > 20))
        )
        const shardsPerRunner2 = getShardsPerRunner(assignments2)
        expect(shardsPerRunner2.every((shards) => shards.length === 6))

        // Check that all runners have 12 shards assigned
        yield* TestClock.adjust("1 minute")
        const assignments3 = yield* manager.getAssignments
        const shardsPerRunner3 = getShardsPerRunner(assignments3)
        expect(shardsPerRunner3.every((shards) => shards.length === 12))
      }).pipe(Effect.provide(TestLive)), 10_000)

    it.effect("should succcessfully scale down", () =>
      Effect.gen(function*() {
        const manager = yield* ShardManager.ShardManager

        // Setup 25 runners
        yield* simulate(Array.range(1, 25).map(registerRunner))
        yield* TestClock.adjust("20 seconds")

        // Check that all runners are assigned and have 12 shards each
        const assignments = yield* manager.getAssignments
        const values = Array.fromIterable(assignments.values())
        const allRunnersAssigned = Array.every(values, Option.isSome)
        expect(allRunnersAssigned).toBe(true)
        const shardsPerRunner = getShardsPerRunner(assignments)
        expect(shardsPerRunner.every((shards) => shards.length === 12))

        // Remove 5 runners
        yield* simulate(Array.range(21, 25).map(unregisterRunner))
        yield* TestClock.adjust("1 second")

        // Check that all shards have already been rebalanced
        const assignments2 = yield* manager.getAssignments
        const allRunnersUnassigned = pipe(
          Array.fromIterable(assignments2.values()),
          Array.every((address) => Option.isSome(address) && address.value.port <= 20)
        )
        expect(allRunnersUnassigned).toBe(true)
        const shardsPerRunner2 = getShardsPerRunner(assignments2)
        expect(shardsPerRunner2.every((shards) => shards.length === 15))
      }).pipe(Effect.provide(TestLive)), 10_000)

    it.effect("should save state to storage when restarted", () =>
      Effect.gen(function*() {
        const setup = Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

          yield* simulate(Array.range(1, 10).map(registerRunner))
          yield* TestClock.adjust("20 seconds")

          // Wait for the forked daemon fibers to do their work
          yield* Effect.iterate(new Map() as ReadonlyMap<ShardId.ShardId, Option.Option<RunnerAddress.RunnerAddress>>, {
            while: (assignments) => assignments.size === 0,
            body: () => storage.getAssignments
          })
          yield* Effect.iterate(Array.empty<[RunnerAddress.RunnerAddress, Runner.Runner]>(), {
            while: Array.isEmptyArray,
            body: () => storage.getRunners
          })
          // Simulate a non-persistent storage restart
          yield* storage.saveAssignments([])
          yield* storage.saveRunners([])
        }).pipe(
          Effect.provide(
            ShardManagerLive.pipe(
              Layer.provide(RunnerHealthLive),
              Layer.provide([MessageStorage.layerNoop, ShardingConfig.layer()])
            )
          )
        )

        const test = Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage
          const shutdownAssignments = yield* storage.getAssignments
          const shutdownRunners = yield* storage.getRunners
          // ShardManager should have saved its state to persistent storage
          // as part of shutdown procedures
          expect(shutdownAssignments.size === 0).toBe(false)
          expect(Array.isEmptyArray(shutdownRunners)).toBe(false)
        })

        yield* setup
        yield* test
      }).pipe(Effect.provide(ShardStorage.layerMemory)), 10_000)
  })
})

function registerRunner(n: number) {
  const runner = Runner.make({
    address: RunnerAddress.make("server", n),
    version: 1
  })
  return SimulationEvent.RegisterRunner({ runner })
}
function unregisterRunner(n: number) {
  const address = RunnerAddress.make("server", n)
  return SimulationEvent.UnregisterRunner({ address })
}

function getShardsPerRunner(assignments: Iterable<[ShardId.ShardId, Option.Option<RunnerAddress.RunnerAddress>]>) {
  const shardsPerRunner = MutableHashMap.empty<RunnerAddress.RunnerAddress, ReadonlyArray<ShardId.ShardId>>()
  for (const [shard, address] of assignments) {
    if (Option.isNone(address)) continue
    MutableHashMap.modifyAt(
      shardsPerRunner,
      address.value,
      Option.match({
        onNone: () => Option.some(Array.of(shard)),
        onSome: (shards) => Option.some(Array.append(shards, shard))
      })
    )
  }
  return MutableHashMap.values(shardsPerRunner)
}

type SimulationEvent = Data.TaggedEnum<{
  readonly RegisterRunner: { readonly runner: Runner.Runner }
  readonly UnregisterRunner: { readonly address: RunnerAddress.RunnerAddress }
}>
const SimulationEvent = Data.taggedEnum<SimulationEvent>()

const handleEvent = SimulationEvent.$match({
  RegisterRunner: ({ runner }) =>
    ShardManager.ShardManager.pipe(
      Effect.flatMap((manager) => manager.register(runner))
    ),
  UnregisterRunner: ({ address }) =>
    ShardManager.ShardManager.pipe(
      Effect.flatMap((manager) => manager.unregister(address))
    )
})

function simulate(events: ReadonlyArray<SimulationEvent>) {
  return Effect.forEach(events, handleEvent, { discard: true })
}
