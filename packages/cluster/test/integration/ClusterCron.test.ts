import { ClusterCron, ClusterSchema, Entity } from "@effect/cluster"
import { assert, describe, it } from "@effect/vitest"
import { Clock, Context, Cron, DateTime, Duration, Effect, Layer } from "effect"
import { type Backend, make } from "./harness.js"

interface Tick {
  readonly at: number
  readonly runner: string
  readonly scheduled: string
}
const everySecond = Cron.unsafeParse("* * * * * *", "UTC")
const testConfig = { shardsPerGroup: 12 } as const
const addressString = (address: { readonly host: string; readonly port: number }) => `${address.host}:${address.port}`
const recordTick = (ticks: Array<Tick>) =>
  Effect.contextWithEffect((context: Context.Context<never>) =>
    Effect.gen(function*() {
      const address = Context.unsafeGet(context, Entity.CurrentAddress),
        runner = Context.unsafeGet(context, Entity.CurrentRunnerAddress)
      const at = yield* Clock.currentTimeMillis, isFirst = ticks.length === 0
      ticks.push({ at, runner: addressString(runner), scheduled: String(address.entityId) })
      return isFirst
    })
  )
const cronProbe = (name: string, shardGroup = "default") =>
  Entity.make(`ClusterCron/${name}`, []).annotate(ClusterSchema.ShardGroup, () => shardGroup)
const nextScheduled = (cron: Cron.Cron, after: DateTime.DateTime.Input) =>
  DateTime.formatIso(DateTime.unsafeFromDate(Cron.next(cron, after)))
const assertScheduledFromExecutionTime = (cron: Cron.Cron, ticks: ReadonlyArray<Tick>, startIndex = 1) => {
  for (let index = startIndex; index < ticks.length; index++) {
    assert.strictEqual(ticks[index].scheduled, nextScheduled(cron, ticks[index - 1].at))
  }
}
const assertScheduledFromPrevious = (cron: Cron.Cron, ticks: ReadonlyArray<Tick>) => {
  assert.strictEqual(ticks[0].scheduled, "initial")
  for (let index = 2; index < ticks.length; index++) {
    assert.strictEqual(ticks[index].scheduled, nextScheduled(cron, ticks[index - 1].scheduled))
  }
}

describe("cluster cron integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.scopedLive(`${backend}: runs once per scheduled instant and continues after failure`, () =>
      Effect.gen(function*() {
        const ticks: Array<Tick> = []
        let failingAttempts = 0, successfulAttempts = 0
        const cron = ClusterCron.make({
          name: `basic-${backend}`,
          cron: everySecond,
          execute: recordTick(ticks).pipe(Effect.asVoid)
        })
        const failingCron = ClusterCron.make({
          name: `failure-${backend}`,
          cron: everySecond,
          execute: Effect.suspend(() => {
            failingAttempts++
            if (failingAttempts === 1) return Effect.fail("expected cron failure")
            successfulAttempts++
            return Effect.void
          })
        })
        const cluster = yield* make({ backend, config: testConfig, entities: Layer.merge(cron, failingCron) })
        yield* cluster.start(3)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The cron jobs did not continue through four scheduled instants",
          Effect.sync(() => ticks.length >= 4 && failingAttempts >= 4)
        )
        const firstFour = ticks.slice(0, 4)
        assert.strictEqual(new Set(firstFour.map((tick) => tick.scheduled)).size, firstFour.length)
        assertScheduledFromExecutionTime(everySecond, firstFour)
        assert.strictEqual(successfulAttempts, failingAttempts - 1)
      }))
    it.scopedLive(`${backend}: calculates the next run from the previous instant or the current time`, () =>
      Effect.gen(function*() {
        const previousTicks: Array<Tick> = [], currentTicks: Array<Tick> = [], gate = yield* Effect.makeLatch()
        let entered = 0
        const blockedExecution = Effect.fnUntraced(function*(ticks: Array<Tick>) {
          if (yield* recordTick(ticks)) {
            entered++
            yield* gate.await
          }
        }, Effect.uninterruptible)
        const previousCron = ClusterCron.make({
          name: `previous-${backend}`,
          cron: everySecond,
          calculateNextRunFromPrevious: true,
          execute: blockedExecution(previousTicks)
        })
        const currentCron = ClusterCron.make({
          name: `current-${backend}`,
          cron: everySecond,
          execute: blockedExecution(currentTicks)
        })
        const cluster = yield* make({ backend, config: testConfig, entities: Layer.merge(previousCron, currentCron) })
        yield* cluster.start(3)
        yield* Effect.addFinalizer(() => gate.open)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil("Both cron executions did not enter their first run", Effect.sync(() => entered === 2))
        const blockedAt = yield* Clock.currentTimeMillis
        yield* cluster.waitUntil(
          "The cron executions were not held across several scheduled instants",
          Effect.map(Clock.currentTimeMillis, (now) => now >= blockedAt + 3_200),
          "5 seconds"
        )
        yield* gate.open
        yield* cluster.waitUntil(
          "The cron jobs did not resume after their first execution",
          Effect.sync(() => previousTicks.length >= 4 && currentTicks.length >= 4),
          "12 seconds"
        )
        const previousSecond = DateTime.toEpochMillis(DateTime.unsafeMake(previousTicks[1].scheduled)),
          currentSecond = DateTime.toEpochMillis(DateTime.unsafeMake(currentTicks[1].scheduled))
        assertScheduledFromPrevious(everySecond, previousTicks)
        assertScheduledFromExecutionTime(everySecond, currentTicks, 2)
        assert.isAtLeast(previousTicks[1].at - previousSecond, 2_000)
        assert.isAtMost(currentTicks[1].at - currentSecond, 1_000)
      }))
    it.scopedLive(`${backend}: catches up or skips stale runs and preserves the schedule across restart`, () =>
      Effect.gen(function*() {
        const catchUpTicks: Array<Tick> = [], skipTicks: Array<Tick> = []
        const catchUpCron = ClusterCron.make({
          name: `catch-up-${backend}`,
          cron: everySecond,
          calculateNextRunFromPrevious: true,
          execute: recordTick(catchUpTicks).pipe(Effect.asVoid)
        })
        const skipCron = ClusterCron.make({
          name: `skip-stale-${backend}`,
          cron: everySecond,
          calculateNextRunFromPrevious: true,
          skipIfOlderThan: Duration.millis(500),
          execute: recordTick(skipTicks).pipe(Effect.asVoid)
        })
        const cluster = yield* make({ backend, config: testConfig, entities: Layer.merge(catchUpCron, skipCron) }),
          runners = yield* cluster.start(3)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The cron schedules did not start",
          Effect.sync(() => catchUpTicks.length >= 2 && skipTicks.length >= 2)
        )
        for (const runner of runners) yield* cluster.kill(runner)
        const catchUpBefore = catchUpTicks.length,
          skipBefore = skipTicks.length,
          lastScheduledBeforeRestart = catchUpTicks[catchUpBefore - 1].scheduled,
          stoppedAt = yield* Clock.currentTimeMillis
        yield* cluster.waitUntil(
          "The cluster downtime window did not elapse",
          Effect.map(Clock.currentTimeMillis, (now) => now >= stoppedAt + 3_200),
          "5 seconds"
        )
        assert.strictEqual(catchUpTicks.length, catchUpBefore)
        assert.strictEqual(skipTicks.length, skipBefore)
        yield* cluster.start(3)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The restarted cluster did not expose the catch-up and stale-skip difference",
          Effect.sync(() => {
            const caughtUp = catchUpTicks.length - catchUpBefore, skipped = skipTicks.length - skipBefore
            return caughtUp >= 3 && caughtUp >= skipped + 2
          }),
          "15 seconds"
        )
        yield* cluster.waitUntil(
          "The stale-skipping cron did not resume",
          Effect.sync(() => skipTicks.length > skipBefore)
        )
        const firstCatchUp = catchUpTicks[catchUpBefore],
          firstAfterSkip = skipTicks[skipBefore],
          firstAfterSkipScheduledAt = DateTime.toEpochMillis(DateTime.unsafeMake(firstAfterSkip.scheduled))
        assert.strictEqual(firstCatchUp.scheduled, nextScheduled(everySecond, lastScheduledBeforeRestart))
        assert.isAtLeast(firstCatchUp.at - DateTime.toEpochMillis(DateTime.unsafeMake(firstCatchUp.scheduled)), 2_000)
        assert.isAtMost(firstAfterSkip.at - firstAfterSkipScheduledAt, 750)
        assertScheduledFromPrevious(everySecond, catchUpTicks)
      }))
    it.scopedLive(`${backend}: resumes without duplicate or missing ticks after the singleton owner dies`, () =>
      Effect.gen(function*() {
        const name = `owner-failover-${backend}`, ticks: Array<Tick> = []
        const cron = ClusterCron.make({
          name,
          cron: everySecond,
          calculateNextRunFromPrevious: true,
          execute: recordTick(ticks).pipe(Effect.asVoid)
        })
        const cluster = yield* make({ backend, config: testConfig, entities: cron })
        yield* cluster.start(3)
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil("The cron did not execute before failover", Effect.sync(() => ticks.length >= 2))
        const owner = yield* cluster.ownerOfEntity(cronProbe(name), name)
        assert.isDefined(owner)
        yield* cluster.kill(owner!)
        const afterKill = ticks.length
        yield* cluster.waitUntil(
          "The cron did not resume after its singleton owner died",
          Effect.sync(() => ticks.length >= afterKill + 3),
          "12 seconds"
        )
        yield* cluster.waitForStableAssignments()
        assertScheduledFromPrevious(everySecond, ticks)
        assert.strictEqual(new Set(ticks.map((tick) => tick.scheduled)).size, ticks.length)
        assert.isTrue(ticks.slice(afterKill).every((tick) => tick.runner !== addressString(owner!.address)))
      }))
    it.scopedLive(`${backend}: assigns cron singletons and executions to their shard groups`, () =>
      Effect.gen(function*() {
        const defaultName = `default-group-${backend}`,
          specialName = `special-group-${backend}`,
          defaultTicks: Array<Tick> = [],
          specialTicks: Array<Tick> = []
        const defaultCron = ClusterCron.make({
          name: defaultName,
          cron: everySecond,
          execute: recordTick(defaultTicks).pipe(Effect.asVoid)
        })
        const specialCron = ClusterCron.make({
          name: specialName,
          cron: everySecond,
          shardGroup: "special",
          execute: recordTick(specialTicks).pipe(Effect.asVoid)
        })
        const cluster = yield* make({
          backend,
          config: { availableShardGroups: ["default", "special"], shardsPerGroup: 12 },
          entities: Layer.merge(defaultCron, specialCron)
        })
        const [defaultRunner] = yield* cluster.start(1, { assignedShardGroups: ["default"] }),
          [specialRunner] = yield* cluster.start(1, { assignedShardGroups: ["special"] })
        yield* cluster.waitForStableAssignments()
        yield* cluster.waitUntil(
          "The shard-group cron jobs did not execute",
          Effect.sync(() => defaultTicks.length >= 2 && specialTicks.length >= 2)
        )
        assert.strictEqual(yield* cluster.ownerOfEntity(cronProbe(defaultName), defaultName), defaultRunner)
        assert.strictEqual(yield* cluster.ownerOfEntity(cronProbe(specialName, "special"), specialName), specialRunner)
        assert.isTrue(defaultTicks.every((tick) => tick.runner === addressString(defaultRunner.address)))
        assert.isTrue(specialTicks.every((tick) => tick.runner === addressString(specialRunner.address)))
      }))
  }
})
