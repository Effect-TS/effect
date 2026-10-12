// Passing tests: Effect (generator and Effect value), plain sync, Promise, TestClock,
// seeded Random, TestConsole.
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Random from "effect/Random"
import * as TestClock from "effect/testing/TestClock"
import * as assert from "node:assert"
import * as Test from "../src/Test.ts"

export default Test.suite("basics", [
  Test.test(
    "a generator test",
    Effect.gen(function*() {
      const n = yield* Effect.succeed(21).pipe(Effect.map((n) => n * 2))
      assert.deepStrictEqual(n, 42)
    })
  ),

  Test.test("an Effect value works too", Effect.sync(() => assert.deepStrictEqual("a".repeat(3), "aaa"))),

  Test.test("a plain sync test", () => {
    assert.deepStrictEqual([1, 2, 3].map((n) => n * 2), [2, 4, 6])
  }),

  Test.test("a Promise test", async () => {
    const value = await new Promise<string>((resolve) => setTimeout(() => resolve("done"), 5))
    assert.deepStrictEqual(value, "done")
  }),

  Test.suite("TestClock", [
    Test.test(
      "time only moves when the test says so",
      Effect.gen(function*() {
        const fiber = yield* Effect.sleep("1 hour").pipe(Effect.as("woke up"), Effect.forkChild)
        yield* TestClock.adjust("59 minutes")
        assert.ok(fiber.pollUnsafe() === undefined, "still asleep after 59 minutes")
        yield* TestClock.adjust("1 minute")
        assert.deepStrictEqual(yield* Fiber.join(fiber), "woke up")
      })
    ),
    Test.test(
      "Effect.timeout under TestClock is virtual",
      Effect.gen(function*() {
        const fiber = yield* Effect.never.pipe(Effect.timeoutOption("10 seconds"), Effect.forkChild)
        yield* TestClock.adjust("10 seconds")
        assert.deepStrictEqual((yield* Fiber.join(fiber))._tag, "None")
      })
    )
  ]).pipe(Test.tags("clock")),

  Test.test(
    "Random is seeded per test (seed is reported; same seed => same draws)",
    Effect.gen(function*() {
      const a = yield* Random.nextIntBetween(0, 1_000_000)
      yield* Console.log(`drew ${a}`)
      assert.ok(a >= 0 && a < 1_000_000)
    }),
    { tags: ["random"] }
  ),

  Test.test(
    "Console output is captured per test (TestConsole), not printed",
    Effect.gen(function*() {
      yield* Console.log("this line is only shown if the test fails")
    })
  )
])
