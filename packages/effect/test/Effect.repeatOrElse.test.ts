import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Option, Result, Schedule } from "effect"

const previousStep = Option.some({
  input: "first",
  output: 0,
  attempt: 1,
  duration: Duration.zero,
  start: 0,
  now: 0,
  elapsed: 0,
  elapsedSincePrevious: 0
})

describe("repeatOrElse metadata preservation", () => {
  it.effect("initial source failure receives None", () =>
    Effect.gen(function*() {
      let calls = 0
      const value = yield* Effect.repeatOrElse(Effect.fail("source"), Schedule.recurs(2), (error, previous) => {
        calls++
        assert.strictEqual(error, "source")
        assert.deepStrictEqual(previous, Option.none())
        return Effect.succeed(7)
      })
      assert.strictEqual(value, 7)
      assert.strictEqual(calls, 1)
    }))
  it.effect("source failure after completed step receives Some metadata", () =>
    Effect.gen(function*() {
      let runs = 0
      const source = Effect.suspend(() => ++runs === 1 ? Effect.succeed("first") : Effect.fail("source"))
      const value = yield* Effect.repeatOrElse(source, Schedule.recurs(2), (error, previous) => {
        assert.strictEqual(error, "source")
        assert.deepStrictEqual(previous, previousStep)
        return Effect.succeed(9)
      })
      assert.strictEqual(value, 9)
      assert.strictEqual(runs, 2)
    }))
  it.effect("normal completion returns schedule output without fallback", () =>
    Effect.gen(function*() {
      let runs = 0
      let calls = 0
      const value = yield* Effect.repeatOrElse(Effect.sync(() => ++runs), Schedule.recurs(2), () => {
        calls++
        return Effect.succeed(-1)
      })
      assert.strictEqual(value, 2)
      assert.strictEqual(runs, 3)
      assert.strictEqual(calls, 0)
    }))
  it.effect("initial schedule failure receives None", () =>
    Effect.gen(function*() {
      const schedule: Schedule.Schedule<number, unknown, string> = Schedule.recurs(2).pipe(
        Schedule.map(() => Effect.fail("schedule"))
      )
      const value = yield* Effect.repeatOrElse(Effect.succeed("first"), schedule, (error, previous) => {
        assert.strictEqual(error, "schedule")
        assert.deepStrictEqual(previous, Option.none())
        return Effect.succeed(4)
      })
      assert.strictEqual(value, 4)
    }))
  it.effect("later schedule failure retains last completed metadata", () =>
    Effect.gen(function*() {
      const schedule = Schedule.recurs(3).pipe(
        Schedule.map((meta) => meta.output === 0 ? Effect.succeed(meta.output) : Effect.fail("schedule"))
      )
      const value = yield* Effect.repeatOrElse(Effect.succeed("first"), schedule, (error, previous) => {
        assert.strictEqual(error, "schedule")
        assert.deepStrictEqual(previous, previousStep)
        return Effect.succeed(5)
      })
      assert.strictEqual(value, 5)
    }))
  it.effect("fallback failure is retained", () =>
    Effect.gen(function*() {
      const result = yield* Effect.result(
        Effect.repeatOrElse(Effect.fail("source"), Schedule.recurs(1), () => Effect.fail("fallback"))
      )
      assert.deepStrictEqual(result, Result.fail("fallback"))
    }))
  it.effect("replay creates fresh previous-step state", () =>
    Effect.gen(function*() {
      let runs = 0
      const source = Effect.suspend(() => ++runs === 1 ? Effect.succeed("first") : Effect.fail("source"))
      const seen: Array<unknown> = []
      const program = Effect.repeatOrElse(source, Schedule.recurs(2), (_error, previous) => {
        seen.push(previous)
        return Effect.succeed(0)
      })
      yield* program
      yield* program
      assert.deepStrictEqual(seen, [previousStep, Option.none()])
      assert.strictEqual(runs, 3)
    }))
})
