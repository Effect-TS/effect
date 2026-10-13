// Options are data on tree nodes, resolved by the coordinator (nearest wins).
// Inline `{ timeout, retries, tags, skip }` and pipeable transformers are equivalent.
import * as Effect from "effect/Effect"
import * as TestClock from "effect/testing/TestClock"
import * as Assert from "../src/Assert.ts"
import * as Test from "../src/Test.ts"

let flakyCalls = 0

const realSleep = (ms: number) => TestClock.withLive(Effect.sleep(ms))

export default Test.suite("options", [
  Test.test(
    "flaky: fails on the first attempt, retried",
    Effect.gen(function*() {
      flakyCalls++
      Assert.atLeast(flakyCalls, 2, "environment not ready yet")
    })
  ).pipe(Test.retries(2)),

  Test.suite("slow suite: timeout 100ms for everything below", [
    Test.test(
      "inherits 100ms and finishes in 20ms",
      Effect.gen(function*() {
        yield* realSleep(20)
      })
    ),
    Test.test(
      "overrides to 1s (nearest wins) and takes 300ms",
      Effect.gen(function*() {
        yield* realSleep(300)
      }),
      { timeout: "1 second", tags: ["slow"] }
    ),
    Test.test(
      "inherits 100ms but takes 300ms (intentional failure)",
      Effect.gen(function*() {
        yield* realSleep(300)
      })
    )
    // these tests only take time: they check nothing on purpose
  ]).pipe(Test.timeout("100 millis"), Test.tags("timing"), Test.noAssertions),

  Test.test("skipped with a reason", () => {
    Assert.equal(1, 2)
  }, { skip: "waiting on upstream fix" }),

  Test.suite("legacy", [
    Test.test("never runs", () => Assert.equal(1, 2))
  ]).pipe(Test.skip("whole suite skipped via a transformer")),

  Test.test("tagged via a transformer", () => Assert.equal("ok", "ok")).pipe(Test.tags("smoke"))
])
