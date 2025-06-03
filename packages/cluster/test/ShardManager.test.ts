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
import { Array, Data, Effect, Fiber, Iterable, Layer, MutableHashMap, Option, pipe, TestClock } from "effect"
import {
  decideAssignmentsForUnassignedShards,
  decideAssignmentsForUnbalancedShards,
  RunnerWithMetadata,
  State
} from "../src/internal/shardManager.js"

const runner1 = RunnerWithMetadata({
  runner: Runner.make({ address: RunnerAddress.make("1", 1), groups: ["default"], version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})
const runner2 = RunnerWithMetadata({
  runner: Runner.make({ address: RunnerAddress.make("2", 2), groups: ["default", "custom"], version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})
const runner3 = RunnerWithMetadata({
  runner: Runner.make({ address: RunnerAddress.make("3", 3), groups: ["default", "custom"], version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})

describe("ShardManager", () => {
  describe("Rebalancing", () => {
    it("should rebalance unbalanced assignments", () => {
      const state = makeDefaultState(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [1, Option.some(runner1.runner.address)],
          [2, Option.some(runner1.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, "default", 1)
      expect(MutableHashMap.has(assignments, runner2.runner.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, runner1.runner.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance to runners with an older version", () => {
      const oldRunner2 = RunnerWithMetadata({
        runner: Runner.make({ address: runner2.runner.address, groups: ["default"], version: 0 }),
        registeredAt: runner2.registeredAt
      })
      const state = makeDefaultState(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, oldRunner2]
        ),
        new Map([
          [1, Option.some(runner1.runner.address)],
          [2, Option.some(runner1.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, "default", 1)
      expect(MutableHashMap.size(assignments) === 0).toBe(true)
      expect(MutableHashMap.size(unassignments) === 0).toBe(true)
    })

    it("should not rebalance when already well-balanced", () => {
      const state = makeDefaultState(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [1, Option.some(runner1.runner.address)],
          [2, Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, "default", 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should not rebalance when there is only a one-shard difference", () => {
      const state = makeDefaultState(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [1, Option.some(runner1.runner.address)],
          [2, Option.some(runner1.runner.address)],
          [3, Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, "default", 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should rebalance when there is more than a one-shard difference", () => {
      const state = makeDefaultState(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2]
        ),
        new Map([
          [1, Option.some(runner1.runner.address)],
          [2, Option.some(runner1.runner.address)],
          [3, Option.some(runner1.runner.address)],
          [4, Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, "default", 1)
      expect(MutableHashMap.has(assignments, runner2.runner.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, runner1.runner.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should pick the runner with less shards", () => {
      const state = makeDefaultState(
        MutableHashMap.make(
          [runner1.runner.address, runner1],
          [runner2.runner.address, runner2],
          [runner3.runner.address, runner3]
        ),
        new Map([
          [1, Option.some(runner1.runner.address)],
          [2, Option.some(runner1.runner.address)],
          [3, Option.some(runner2.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, "default", 1)
      expect(MutableHashMap.has(assignments, runner3.runner.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, runner1.runner.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance if there are no runners", () => {
      const state = makeDefaultState(
        MutableHashMap.empty(),
        new Map([
          [1, Option.some(runner1.runner.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, "default", 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should balance well when many nodes are starting sequentially", () => {
      const shards = Array.makeBy(
        300,
        (i) => [i + 1, Option.none<RunnerAddress.RunnerAddress>()] as const
      )
      const state = makeDefaultState(MutableHashMap.empty(), new Map(shards))
      for (let i = 1; i <= 30; i++) {
        const address = RunnerAddress.make(`${i}`, i)
        state.addRunner(Runner.make({ address, groups: ["default"], version: 1 }), Date.now())
        const [assignments, unassignments] = state.unassignedShards("default").length > 0
          ? decideAssignmentsForUnassignedShards(state, "default")
          : decideAssignmentsForUnbalancedShards(state, "default", 1)
        for (const [, shards] of unassignments) {
          state.addAssignments(globalThis.Array.from(shards, (id) => ShardId.make("default", id)), Option.none())
        }
        for (const [address, shards] of assignments) {
          state.addAssignments(globalThis.Array.from(shards, (id) => ShardId.make("default", id)), Option.some(address))
        }
      }
      const shardsPerRunner = state.shardsPerRunner("default").pipe(
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
        rebalanceDebounce: 500,
        rebalanceInterval: "20 seconds"
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
      Layer.provide([
        MessageStorage.layerNoop,
        ShardingConfig.layer({
          shardGroups: ["custom"]
        })
      ])
    )

    it.effect("should successfully scale up", () =>
      Effect.gen(function*() {
        const manager = yield* ShardManager.ShardManager

        // Setup 20 runners first
        yield* simulate(Array.range(1, 20).map(registerRunner))

        // Check that all runners are assigned and have 15 shards each
        const assignments = yield* manager.getAssignments
        const values = globalThis.Array.from(assignments, ([, address]) => address)
        const allRunnersAssigned = Array.every(values, Option.isSome)
        expect(allRunnersAssigned).toBe(true)
        let shardsPerRunner = getShardsPerRunner(assignments, "default")
        expect(shardsPerRunner.every((shards) => shards.length === 15)).toBe(true)
        shardsPerRunner = getShardsPerRunner(assignments, "custom")
        expect(shardsPerRunner.every((shards) => shards.length === 30)).toBe(true)

        // Setup another 5 runners
        yield* simulate(Array.range(21, 25).map(registerRunner))
        yield* TestClock.adjust("20 seconds")

        // Check that each of the new runners received 6 shards
        const assignments2 = yield* manager.getAssignments.pipe(
          Effect.map(Iterable.filter(([shardId, address]) =>
            shardId.group === "default" && Option.isSome(address) && address.value.port > 20
          ))
        )
        const shardsPerRunner2 = getShardsPerRunner(assignments2, "default")
        expect(shardsPerRunner2.every((shards) =>
          shards.length === 6
        )).toBe(true)

        // Check that all runners have 12 shards assigned
        yield* TestClock.adjust("1 minute")
        const assignments3 = yield* manager.getAssignments
        const shardsPerRunner3 = getShardsPerRunner(assignments3, "default")
        expect(shardsPerRunner3.every((shards) => shards.length === 12)).toBe(true)
      }).pipe(Effect.provide(TestLive)), 10_000)

    it.effect("should succcessfully scale down", () =>
      Effect.gen(function*() {
        const manager = yield* ShardManager.ShardManager

        // Setup 25 runners
        yield* simulate(Array.range(1, 25).map(registerRunner))
        yield* TestClock.adjust("20 seconds")
        yield* TestClock.adjust("20 seconds")
        yield* TestClock.adjust("20 seconds")

        // Check that all runners are assigned and have 12 shards each
        const assignments = yield* manager.getAssignments
        const values = globalThis.Array.from(assignments, ([, address]) => address)
        const allRunnersAssigned = Array.every(values, Option.isSome)
        expect(allRunnersAssigned).toBe(true)
        let shardsPerRunner = getShardsPerRunner(assignments, "default")
        expect(shardsPerRunner.every((shards) => shards.length === 12)).toBe(true)
        shardsPerRunner = getShardsPerRunner(assignments, "custom")
        expect(shardsPerRunner.every((shards) => shards.length === 25)).toBe(true)

        // Remove 5 runners
        yield* simulate(Array.range(21, 25).map(unregisterRunner))
        yield* TestClock.adjust("1 second")

        // Check that all shards have already been rebalanced
        const assignments2 = yield* manager.getAssignments
        const allRunnersUnassigned = pipe(
          Array.fromIterable(assignments2),
          Array.every(([, address]) => Option.isSome(address) && address.value.port <= 20)
        )
        expect(allRunnersUnassigned).toBe(true)
        const shardsPerRunner2 = getShardsPerRunner(assignments2, "default")
        expect(shardsPerRunner2.every((shards) => shards.length === 15)).toBe(true)
      }).pipe(Effect.provide(TestLive)), 10_000)

    it.effect("should save state to storage when restarted", () =>
      Effect.gen(function*() {
        const setup = Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

          yield* simulate(Array.range(1, 10).map(registerRunner))
          yield* TestClock.adjust("20 seconds")

          // Wait for the forked daemon fibers to do their work
          yield* Effect.iterate(Array.empty<[ShardId.ShardId, Option.Option<RunnerAddress.RunnerAddress>]>(), {
            while: Array.isEmptyArray,
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
          expect(shutdownAssignments.length === 0).toBe(false)
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
    groups: n % 2 === 0 ? ["default", "custom"] : ["default"],
    version: 1
  })
  return SimulationEvent.RegisterRunner({ runner })
}
function unregisterRunner(n: number) {
  const address = RunnerAddress.make("server", n)
  return SimulationEvent.UnregisterRunner({ address })
}

function getShardsPerRunner(
  assignments: Iterable<readonly [ShardId.ShardId, Option.Option<RunnerAddress.RunnerAddress>]>,
  group: string
) {
  const shardsPerRunner = MutableHashMap.empty<RunnerAddress.RunnerAddress, ReadonlyArray<number>>()
  for (const [shard, address] of assignments) {
    if (shard.group !== group || Option.isNone(address)) continue
    MutableHashMap.modifyAt(
      shardsPerRunner,
      address.value,
      Option.match({
        onNone: () => Option.some(Array.of(shard.id)),
        onSome: (shards) => Option.some(Array.append(shards, shard.id))
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

const simulate = Effect.fnUntraced(function*(events: ReadonlyArray<SimulationEvent>) {
  const fiber = yield* Effect.forEach(events, handleEvent, { concurrency: events.length, discard: true }).pipe(
    Effect.fork
  )
  yield* TestClock.adjust(1)
  // Wait for shard manager to debounce rebalancing
  yield* TestClock.adjust(500)
  yield* TestClock.adjust(500)
  yield* Fiber.join(fiber)
})

const makeDefaultState = (
  runners: MutableHashMap.MutableHashMap<RunnerAddress.RunnerAddress, RunnerWithMetadata>,
  shards: Map<number, Option.Option<RunnerAddress.RunnerAddress>>
) =>
  new State(
    runners,
    new Map([["default", runners]]),
    new Map([["default", shards]]),
    shards.size
  )
