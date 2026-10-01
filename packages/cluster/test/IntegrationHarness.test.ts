import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, FiberId, Option, TestClock } from "effect"
import { waitUntil } from "./integration/waitUntil.js"

describe("integration waitUntil", () => {
  for (const suspended of [false, true]) {
    it.effect(
      suspended
        ? "reports diagnostics when the condition times out"
        : "reports diagnostics after a false poll at the deadline",
      () =>
        Effect.gen(function*() {
          let polls = 0
          let snapshots = 0
          const snapshot = { assignments: { shard: [] }, messageCounts: { unprocessed: 1 } }
          const fiber = yield* waitUntil(
            "Owner did not move",
            Effect.suspend(() => {
              polls++
              return suspended ? Effect.never : Effect.succeed(false)
            }),
            Effect.sync(() => {
              snapshots++
              return snapshot
            }),
            200
          ).pipe(Effect.fork)
          yield* TestClock.adjust(199)
          assert.isTrue(Option.isNone(yield* Fiber.poll(fiber)))
          assert.strictEqual(snapshots, 0)
          yield* TestClock.adjust(1)
          const exit = yield* Fiber.await(fiber)
          assert.deepStrictEqual(
            exit,
            Exit.fail(
              new Error(
                `Owner did not move\n${JSON.stringify(snapshot, null, 2)}`
              )
            )
          )
          assert.strictEqual(snapshots, 1)
          assert.strictEqual(polls, suspended ? 1 : 3)
        })
    )
  }

  it.effect("succeeds before the deadline without collecting diagnostics", () =>
    Effect.gen(function*() {
      let polls = 0
      const fiber = yield* waitUntil(
        "unused",
        Effect.sync(() => ++polls === 2),
        Effect.die("unexpected diagnostics"),
        200
      ).pipe(Effect.fork)
      yield* TestClock.adjust(100)
      assert.deepStrictEqual(yield* Fiber.await(fiber), Exit.succeed(undefined))
      assert.strictEqual(polls, 2)
    }))

  for (
    const [name, condition] of [
      ["typed failure", Effect.fail("condition failed")],
      ["condition's own timeout", Effect.fail(new Cause.TimeoutException())],
      ["defect", Effect.die("condition defect")],
      ["interruption", Effect.interruptWith(FiberId.make(123, 0))]
    ] as ReadonlyArray<readonly [string, Effect.Effect<never, string | Cause.TimeoutException>]>
  ) {
    it.effect(
      `preserves ${name}`,
      () =>
        Effect.gen(function*() {
          const expected = yield* Effect.exit(condition)
          const actual = yield* Effect.exit(waitUntil(
            "must not replace the cause",
            condition,
            Effect.die("unexpected diagnostics"),
            200
          ))
          assert.deepStrictEqual(actual, expected)
        })
    )
  }
})
