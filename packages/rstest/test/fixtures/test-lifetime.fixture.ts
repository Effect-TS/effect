import { afterEach, describe, expect, it, layer } from "@effect/rstest"
import { Effect, Fiber, Layer } from "effect"
import { TestClock } from "effect/testing"

const suiteAcquired = "suite acquired"
const testAcquired = "test acquired"
const testReleased = "test released"

const expectedTimeout = "expected-timeout"
const expectedFailure = "expected-failure"
// Run only in the child runner: ordinary failures/timeouts are intentional.
for (
  const mode of [
    "timeout",
    expectedTimeout,
    "success",
    "failure",
    expectedFailure,
    "unexpected-success",
    "skipped",
    "runtime-skip"
  ] as const
) {
  describe(mode, () => {
    const events: Array<string> = []
    const timedOut = mode === "timeout" || mode === expectedTimeout
    const skipped = mode === "skipped"
    const afterTest = skipped
      ? [suiteAcquired]
      : [
        suiteAcquired,
        testAcquired,
        ...(timedOut ? ["afterEach", testReleased] : [testReleased, "afterEach"]),
        "finished"
      ]
    const resource = Layer.effectDiscard(
      Effect.acquireRelease(
        Effect.sync(() => events.push(suiteAcquired)),
        () => Effect.sync(() => events.push("suite released"))
      )
    )
    layer(resource, { excludeTestServices: true })("resource", (suiteIt) => {
      afterEach((ctx) => {
        if (ctx.task.name !== mode) {
          return
        }
        // Rstest runs native afterEach BEFORE onTestFinished. The barrier cannot
        // order native hooks after timeout cleanup; record that boundary explicitly.
        expect(events).toEqual([suiteAcquired, testAcquired, ...(timedOut ? [] : [testReleased])])
        events.push("afterEach")
      })
      const expectedToFail = mode === expectedTimeout || mode === expectedFailure || mode === "unexpected-success"
      const activeTest = expectedToFail ? suiteIt.effect.fails : suiteIt.effect
      const test = skipped ? suiteIt.effect.skip : activeTest
      test(
        mode,
        (ctx) =>
          Effect.gen(function* testLifetime() {
            ctx.onTestFinished(() => {
              expect(events).toEqual(afterTest.slice(0, -1))
              events.push("finished")
            })
            yield* Effect.acquireRelease(
              Effect.sync(() => events.push(testAcquired)),
              () =>
                // This layer intentionally uses live time: cleanup must outlast
                // the runner's real deadline, not an Effect/TestClock deadline.
                Effect.sleep(150).pipe(
                  Effect.andThen(Effect.sync(() => events.push(testReleased)))
                )
            )
            if (timedOut) {
              return yield* Effect.never
            }
            if (mode === "runtime-skip") {
              ctx.skip()
            }
            if (mode === "failure" || mode === expectedFailure) {
              return yield* Effect.die("intentional-test-failure")
            }
            return false
          }),
        timedOut ? 30 : 2000
      )
      suiteIt.effect("next test waits for cleanup", () =>
        Effect.sync(() => {
          expect(events).toEqual(afterTest)
          events.push("next test")
        }))
    })
    it.effect("parent releases after test cleanup", () =>
      Effect.sync(() => {
        expect(events).toEqual([...afterTest, "next test", "suite released"])
      }))
  })
}

it.effect("virtual-clock success still completes normally", () =>
  Effect.gen(function* virtualClockSuccess() {
    const fiber = yield* Effect.forkChild(Effect.sleep("1 hour").pipe(Effect.as(42)))
    yield* TestClock.adjust("1 hour")
    expect(yield* Fiber.join(fiber)).toBe(42)
  }))
