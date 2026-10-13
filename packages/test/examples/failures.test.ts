// Intentional failures, one per failure class, so the reporters have something to show.
// Every test here whose name says "(intentional failure)" is expected to fail.
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as assert from "node:assert"
import * as Assert from "../src/Assert.ts"
import * as Matcher from "../src/Matcher.ts"
import * as Test from "../src/Test.ts"
import { assertActiveAdmin } from "./helpers.ts"

class UserNotFound extends Data.TaggedError("UserNotFound")<{ readonly userId: string; readonly tenant: string }> {}

const findUser = (userId: string) =>
  Effect.gen(function*() {
    yield* Console.log(`looking up ${userId}`)
    return yield* new UserNotFound({ userId, tenant: "acme" })
  })

export default Test.suite("failures", [
  Test.suite("assertions", [
    Test.test(
      "structural diff: every differing path (intentional failure)",
      Effect.gen(function*() {
        const user = { name: "Ada", roles: ["admin", "dev"], address: { city: "London", zip: "N1" } }
        const updated = { ...user, roles: ["admin"], address: { ...user.address, zip: "N2" } }
        Assert.equal(updated, user)
      })
    ),
    Test.test("plain sync assertion (intentional failure)", () => {
      Assert.equal(0.1 + 0.2, 0.3)
    }),
    Test.test("matchers inside the expected value (intentional failure)", () => {
      const user = { id: "u-1", name: "Ada", createdAt: new Date(0), tags: ["b", "a"] }
      Assert.equal(user, {
        id: Matcher.match(/^user-/),
        name: "Ada",
        createdAt: Matcher.instanceOf(Date),
        tags: Matcher.unordered(["a", "c"])
      })
    }),
    Test.test("narrowing: the shape is wrong, the test stops (intentional failure)", () => {
      const found: Option.Option<{ readonly name: string }> = Option.none()
      const user = Assert.some(found, "the user should exist")
      Assert.equal(user.name, "Ada")
    }),
    Test.test(
      "an Effect's outcome: expected one typed failure (intentional failure)",
      Effect.gen(function*() {
        const lookup: Effect.Effect<string, UserNotFound> = Effect.die(new Error("connection reset"))
        const exit = yield* Effect.exit(lookup)
        Assert.tag(Assert.failure(exit), "UserNotFound")
      })
    ),
    Test.test("a custom assertion in another file (intentional failure)", () => {
      assertActiveAdmin({ name: "Ada", active: true, roles: ["dev"] })
    }),
    Test.test("soft: every failed check in one run (intentional failure)", () => {
      Assert.soft(() => {
        Assert.equal({ status: 404 }, { status: 200 }, "status")
        Assert.includes("hello", "world")
        Assert.closeTo(1.5, 1, { abs: 0.1 })
      })
    }),
    Test.test(
      "eventually gives up with the last failure (intentional failure)",
      Effect.gen(function*() {
        const ready = yield* Ref.make(false)
        yield* Assert.eventually(
          Effect.gen(function*() {
            Assert.isTrue(yield* Ref.get(ready), "the service should be ready")
          }),
          { timeout: "1 second", interval: "100 millis" }
        )
      })
    ),
    Test.test("node:assert is reported too (intentional failure)", () => {
      assert.deepStrictEqual([1, 2], [1, 3])
    })
  ]),

  Test.suite("cause-aware", [
    Test.test(
      "typed error with fields (intentional failure)",
      Effect.gen(function*() {
        const user = yield* findUser("u-42")
        Assert.defined(user)
      })
    ),
    Test.test(
      "defect (intentional failure)",
      Effect.gen(function*() {
        const config: { readonly retries?: { readonly max: number } } = {}
        const max = yield* Effect.sync(() => config.retries!.max)
        Assert.equal(max, 3)
      })
    ),
    Test.test(
      "timeout interrupts the fiber and runs finalizers (intentional failure)",
      Effect.gen(function*() {
        yield* Effect.acquireRelease(
          Console.log("acquired connection"),
          () => Console.log("released connection (finalizer ran on timeout)")
        )
        // forgot to TestClock.adjust: virtual time never moves, the real-time timeout fires
        yield* Effect.sleep("1 minute")
      })
    ).pipe(Test.timeout("200 millis"))
  ]),

  Test.suite("no silent greens", [
    Test.test("a function returning an Effect never runs it (intentional failure)", () =>
      Effect.sync(() => Assert.equal(1, 1))),
    Test.test("discarded Effect from a Promise test (intentional failure)", async () => {
      await Promise.resolve()
      return Effect.sync(() => Assert.equal(1, 1))
    }),
    Test.test(
      "Effect<Effect> is a discarded effect too (intentional failure)",
      Effect.gen(function*() {
        return Effect.log("never runs")
      })
    ),
    // a bare generator function type-checks as a plain function, so it is caught at runtime
    Test.test("a bare generator never runs (intentional failure)", function*() {
      Assert.isTrue(true)
    }),
    Test.test("a caught assertion failure still fails the test (intentional failure)", () => {
      try {
        Assert.equal("actual", "expected")
      } catch {
        // swallowed
      }
    }),
    Test.test(
      "an assertion in a fiber the test never joins (intentional failure)",
      Effect.gen(function*() {
        yield* Effect.forkDetach(Effect.sync(() => Assert.equal("child", "parent")))
        yield* Effect.yieldNow
        Assert.isTrue(true)
      })
    ),
    Test.test(
      "an assertion Effect built but never run (intentional failure)",
      Effect.gen(function*() {
        // @effect-diagnostics-next-line floatingEffect:off
        Assert.eventually(() => Assert.isTrue(true)) // missing yield*
      })
    ),
    Test.test(
      "a test that makes no assertions (intentional failure)",
      Effect.gen(function*() {
        yield* Effect.log("did something, checked nothing")
      })
    )
  ])
])
