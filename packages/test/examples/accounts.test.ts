// A bank account, tested the Effect way: services and layers, shared layers and overrides,
// typed errors, concurrency, scoped resources and virtual time. Self-contained.
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as TestClock from "effect/testing/TestClock"
import * as Assert from "../src/Assert.ts"
import * as Test from "../src/Test.ts"

// --- the code under test

let feeTableLoads = 0

class Fees extends Context.Service<Fees, { readonly withdrawal: number }>()("Fees") {
  /** The standard fee table. Loading it is expensive, so the whole file shares one. */
  static readonly standard = Layer.effect(Fees)(Effect.sync(() => {
    feeTableLoads++
    return { withdrawal: 1 }
  }))
  /** No fees, e.g. during a promotion. */
  static readonly free = Layer.succeed(Fees)({ withdrawal: 0 })
}

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
      const fees = yield* Fees
      const balance = yield* Ref.make(opening)
      return {
        balance: Ref.get(balance),
        deposit: (amount) => Ref.update(balance, (current) => current + amount),
        withdraw: (amount) =>
          // decide and update atomically, then run the outcome: concurrent withdrawals can't race
          Ref.modify(balance, (current): readonly [Effect.Effect<void, InsufficientFunds>, number] =>
            current >= amount + fees.withdrawal
              ? [Effect.void, current - amount - fees.withdrawal]
              : [Effect.fail(new InsufficientFunds({ balance: current, amount })), current]).pipe(Effect.flatten)
      }
    }))
}

// --- the tests

export default Test.suite("Account", [
  Test.suite("balance", [
    Test.test(
      "deposits and withdrawals change the balance, minus the fee",
      Effect.gen(function*() {
        const account = yield* Account
        yield* account.deposit(50)
        yield* account.withdraw(30)
        Assert.equal(yield* account.balance, 119)
      })
    ).pipe(Test.provide(Account.layer(100))),

    Test.test(
      "overdrawing fails with a typed error and leaves the balance alone",
      Effect.gen(function*() {
        const account = yield* Account
        const error = Assert.failure(yield* Effect.exit(account.withdraw(500)))
        Assert.equal(error, new InsufficientFunds({ balance: 100, amount: 500 }))
        Assert.equal(yield* account.balance, 100)
      })
    ).pipe(Test.provide(Account.layer(100))),

    Test.test(
      "concurrent withdrawals never overdraw",
      Effect.gen(function*() {
        const account = yield* Account
        // 100 withdrawals of 9 (+1 fee) race for a balance of 500: exactly half can succeed
        const results = yield* Effect.forEach(
          Array.from({ length: 100 }, () => account.withdraw(9)),
          (withdrawal) => Effect.exit(withdrawal),
          { concurrency: "unbounded" }
        )
        Assert.equal(results.filter((exit) => exit._tag === "Success").length, 50)
        Assert.equal(yield* account.balance, 0)
      })
    ).pipe(Test.provide(Account.layer(500)))
  ]),

  Test.suite("fees: a shared layer and its overrides", [
    Test.test(
      "the fee table is loaded once and shared by every test in the file",
      Effect.gen(function*() {
        const fees = yield* Fees
        Assert.equal(fees.withdrawal, 1)
        Assert.equal(feeTableLoads, 1)
      })
    ),

    Test.test(
      "one test can replace the shared layer",
      Effect.gen(function*() {
        const account = yield* Account
        yield* account.withdraw(30)
        Assert.equal(yield* account.balance, 70)
      })
      // compose the layers, then provide once: this account is built with free fees
    ).pipe(Test.provide(Account.layer(100).pipe(Layer.provide(Fees.free)))),

    Test.test(
      "part of a test can override it, and the innermost provide wins",
      Effect.gen(function*() {
        const standard = yield* Fees
        const promotion = yield* Fees.pipe(Effect.provide(Fees.free))
        Assert.equal(standard.withdrawal, 1)
        Assert.equal(promotion.withdrawal, 0)
      })
    )
  ]),

  Test.suite("time and resources", [
    Test.test(
      "monthly interest arrives on schedule (virtual time)",
      Effect.gen(function*() {
        const account = yield* Account
        const payInterest = Effect.sleep("30 days").pipe(Effect.andThen(account.deposit(5)), Effect.forever)
        yield* Effect.forkChild(payInterest)
        // time only moves when the test says so: 90 days pass instantly
        yield* TestClock.adjust("90 days")
        Assert.equal(yield* account.balance, 115)
      })
    ).pipe(Test.provide(Account.layer(100))),

    Test.test(
      "a slow bank API times out (virtual time)",
      Effect.gen(function*() {
        const slowCall = Effect.sleep("1 minute").pipe(Effect.as("response"))
        const fiber = yield* Effect.forkChild(Effect.timeoutOption(slowCall, "10 seconds"))
        yield* TestClock.adjust("10 seconds")
        Assert.none(yield* Fiber.join(fiber))
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
        const exportStatement = Effect.scoped(file.pipe(Effect.andThen(Effect.fail("disk full"))))
        Assert.equal(Assert.failure(yield* Effect.exit(exportStatement)), "disk full")
        Assert.equal(events, ["open", "close"])
      })
    )
  ])
  // Provided on the root suite: built once for this file and shared by all of its tests.
  // Listing `Fees.standard` in etest.config.ts `shared` would share it across files too.
]).pipe(Test.provide(Fees.standard))
