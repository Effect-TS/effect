// Intentional failures, one per failure class, so the reporters have something to show.
// Every test here whose name says "(intentional failure)" is expected to fail.
import { Console, Data, Effect } from "effect"
import * as assert from "node:assert"
import * as Test from "../src/Test.ts"

class UserNotFound extends Data.TaggedError("UserNotFound")<{ readonly userId: string; readonly tenant: string }> {}

const findUser = (userId: string) =>
  Effect.gen(function*() {
    yield* Console.log(`looking up ${userId}`)
    return yield* new UserNotFound({ userId, tenant: "acme" })
  })

export default Test.suite("failures", [
  Test.suite("assertions", [
    Test.test("structural diff (intentional failure)", Effect.gen(function*() {
      const user = { name: "Ada", roles: ["admin", "dev"], address: { city: "London", zip: "N1" } }
      const updated = { ...user, roles: ["admin"], address: { ...user.address, zip: "N2" } }
      assert.deepStrictEqual(updated, user)
    })),
    Test.test("plain sync assertion (intentional failure)", () => {
      assert.deepStrictEqual(0.1 + 0.2, 0.3)
    })
  ]),

  Test.suite("cause-aware", [
    Test.test("typed error with fields (intentional failure)", Effect.gen(function*() {
      const user = yield* findUser("u-42")
      assert.ok(user !== undefined)
    })),
    Test.test("defect (intentional failure)", Effect.gen(function*() {
      const config: { readonly retries?: { readonly max: number } } = {}
      yield* Effect.sync(() => config.retries!.max)
      assert.ok(true)
    })),
    Test.test("timeout interrupts the fiber and runs finalizers (intentional failure)", Effect.gen(function*() {
      yield* Effect.acquireRelease(
        Console.log("acquired connection"),
        () => Console.log("released connection (finalizer ran on timeout)")
      )
      // forgot to TestClock.adjust: virtual time never moves, the real-time timeout fires
      yield* Effect.sleep("1 minute")
      assert.ok(true)
    })).pipe(Test.timeout("200 millis"))
  ]),

  Test.suite("no silent greens", [
    Test.test("a function returning an Effect never runs it (intentional failure)", () => Effect.sync(() => assert.deepStrictEqual(1, 1))),
    Test.test("discarded Effect from a Promise test (intentional failure)", async () => {
      await Promise.resolve()
      return Effect.sync(() => assert.deepStrictEqual(1, 1))
    }),
    Test.test("Effect<Effect> is a discarded effect too (intentional failure)", Effect.gen(function*() {
      return Effect.log("never runs")
    })),
    // a bare generator function type-checks as a plain function, so it is caught at runtime
    Test.test("a bare generator never runs (intentional failure)", function*() {
      assert.ok(true)
    })
  ])
])
