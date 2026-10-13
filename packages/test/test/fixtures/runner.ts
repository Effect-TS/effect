// Tests the runner runs in Runner.test.ts (not a *.test.ts file, so it is not discovered).
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Assert from "../../src/Assert.ts"
import * as Test from "../../src/Test.ts"
import { helper } from "./helper.ts"

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5))

export default Test.suite("runner", [
  Test.test("passes", () => {
    Assert.equal(1, 1)
    Assert.isTrue(true)
  }),
  Test.test("caught", () => {
    try {
      Assert.equal(1, 2)
    } catch {
      // swallowed
    }
  }),
  Test.test(
    "unjoined",
    Effect.gen(function*() {
      yield* Effect.forkDetach(Effect.sync(() => Assert.equal("child", "parent")))
      yield* Effect.yieldNow
      Assert.isTrue(true)
    })
  ),
  Test.test(
    "never run",
    Effect.gen(function*() {
      // @effect-diagnostics-next-line floatingEffect:off
      Assert.eventually(() => Assert.isTrue(true))
    })
  ),
  Test.test("never awaited", () => {
    Assert.rejects(Promise.reject("x"))
  }),
  Test.test("nothing", () => {}),
  Test.test("nothing, on purpose", () => {}).pipe(Test.noAssertions),
  Test.test("soft", () => {
    Assert.soft(() => {
      Assert.equal(1, 2)
      Assert.equal(3, 4)
    }, "batch")
  }),
  // not `() => helper()`: on Bun (JavaScriptCore) a tail call leaves no frame in this file
  Test.test("helper", () => {
    helper()
  }),
  Test.test("async a", async () => {
    Assert.isTrue(true)
    await tick()
    Assert.isTrue(true)
    await tick()
    Assert.isTrue(true)
  }),
  Test.property("property", Schema.Int, (n) => {
    Assert.isTrue(n < 10, "small")
  }),
  Test.test("async b", async () => {
    await tick()
    Assert.isTrue(true)
  })
])
