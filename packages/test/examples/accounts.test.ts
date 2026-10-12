// A bank account, tested the Effect way: a service and its layer, typed errors,
// concurrency, scoped resources and virtual time. Self-contained: no shared helpers.
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as TestClock from "effect/testing/TestClock"
import * as assert from "node:assert"
import * as Test from "../src/Test.ts"

// --- the code under test

class InsufficientFunds extends Data.TaggedError("InsufficientFunds")<{
  readonly balance: number
  readonly amount: number
}> {}

class Account extends Context.Service<Account, {
  readonly balance: Effect.Effect<number>
  readonly deposit: (amount: number) => Effect.Effect<void>
  readonly withdraw: (amount: number) => Effect.Effect<void, InsufficientFunds>
}>()("Account") {
  /** An in-memory account with an opening balance. Each test that provides it gets its own. */
  static readonly layer = (opening: number) =>
    Layer.effect(Account)(Effect.gen(function*() {
      const balance = yield* Ref.make(opening)
      return {
        balance: Ref.get(balance),
        deposit: (amount) => Ref.update(balance, (current) => current + amount),
        withdraw: (amount) =>
          // decide and update atomically, then run the outcome: concurrent withdrawals can't race
          Ref.modify(balance, (current): readonly [Effect.Effect<void, InsufficientFunds>, number] =>
            current >= amount
              ? [Effect.void, current - amount]
              : [Effect.fail(new InsufficientFunds({ balance: current, amount })), current]).pipe(Effect.flatten)
      }
    }))
}

// --- the tests

export default Test.suite("Account", [
  Test.test(
    "deposits and withdrawals change the balance",
    Effect.gen(function*() {
      const account = yield* Account
      yield* account.deposit(50)
      yield* account.withdraw(30)
      assert.strictEqual(yield* account.balance, 120)
    })
  ).pipe(Test.provide(Account.layer(100))),

  Test.test(
    "overdrawing fails with a typed error and leaves the balance alone",
    Effect.gen(function*() {
      const account = yield* Account
      const error = yield* Effect.flip(account.withdraw(500))
      assert.deepStrictEqual(error, new InsufficientFunds({ balance: 100, amount: 500 }))
      assert.strictEqual(yield* account.balance, 100)
    })
  ).pipe(Test.provide(Account.layer(100))),

  Test.test(
    "concurrent withdrawals never overdraw",
    Effect.gen(function*() {
      const account = yield* Account
      // 100 withdrawals of 10 race for a balance of 500: exactly half can succeed
      const results = yield* Effect.forEach(
        Array.from({ length: 100 }, () => account.withdraw(10)),
        (withdrawal) => Effect.exit(withdrawal),
        { concurrency: "unbounded" }
      )
      assert.strictEqual(results.filter((exit) => exit._tag === "Success").length, 50)
      assert.strictEqual(yield* account.balance, 0)
    })
  ).pipe(Test.provide(Account.layer(500))),

  Test.test(
    "monthly interest arrives on schedule (virtual time)",
    Effect.gen(function*() {
      const account = yield* Account
      const payInterest = Effect.sleep("30 days").pipe(Effect.andThen(account.deposit(5)), Effect.forever)
      yield* Effect.forkChild(payInterest)
      // time only moves when the test says so: 90 days pass instantly
      yield* TestClock.adjust("90 days")
      assert.strictEqual(yield* account.balance, 115)
    })
  ).pipe(Test.provide(Account.layer(100))),

  Test.test(
    "a slow bank API times out (virtual time)",
    Effect.gen(function*() {
      const slowCall = Effect.sleep("1 minute").pipe(Effect.as("response"))
      const fiber = yield* Effect.forkChild(Effect.timeoutOption(slowCall, "10 seconds"))
      yield* TestClock.adjust("10 seconds")
      assert.deepStrictEqual(yield* Fiber.join(fiber), Option.none())
    })
  ),

  Test.test(
    "a statement export always closes its file, even when it fails",
    Effect.gen(function*() {
      const events: Array<string> = []
      const file = Effect.acquireRelease(
        Effect.sync(() => events.push("open")),
        () => Effect.sync(() => events.push("close"))
      )
      const exportStatement = Effect.scoped(
        file.pipe(Effect.andThen(Effect.fail("disk full")))
      )
      assert.strictEqual(yield* Effect.flip(exportStatement), "disk full")
      assert.deepStrictEqual(events, ["open", "close"])
    })
  )
])
