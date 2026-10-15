import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Deferred, Effect, Exit, Fiber, Logger, Option, Scope } from "effect"
import { SqlClient, SqlError } from "effect/sql"

interface StubConnection {
  readonly id: string
}

interface StubTransactionConnection {
  readonly _: unique symbol
}

const sqlError = (message: string) =>
  new SqlError.SqlError({
    reason: new SqlError.UnknownError({ cause: new Error(message), message })
  })

let harnessIdCounter = 0

/**
 * Builds a `makeWithTransaction` wrapper over stub transaction commands, so the
 * transaction control flow can be driven without a database driver.
 *
 * The stubs mirror the driver contract: `rollback` and `rollbackSavepoint` fail
 * when no transaction or savepoint is active, which is what a real database
 * reports when a rollback is issued after a failed `BEGIN`.
 *
 * Savepoint release is opt-in, as it is for drivers: pass `true` to enable it,
 * or a `SqlError` to enable it and have it fail.
 */
const makeHarness = (options: {
  readonly begin?: SqlError.SqlError | undefined
  readonly closeConnection?: Effect.Effect<void> | undefined
  readonly commit?: (() => Effect.Effect<void, SqlError.SqlError>) | undefined
  readonly onCommitFailure?: (() => Effect.Effect<void, SqlError.SqlError>) | undefined
  readonly savepoint?: SqlError.SqlError | undefined
  readonly rollbackSavepoint?: SqlError.SqlError | undefined
  readonly releaseSavepoint?: true | SqlError.SqlError | undefined
} = {}) => {
  const release = options.releaseSavepoint
  const onCommitFailure = options.onCommitFailure
  const calls: Array<string> = []
  const conn: StubConnection = { id: "stub" }
  const transactionService = Context.Service<
    StubTransactionConnection,
    readonly [conn: StubConnection, counter: number]
  >(`test/SqlClient/TransactionConnection/${harnessIdCounter++}`)

  let transactionActive = false
  const savepoints: Array<number> = []

  const record = (name: string) => Effect.sync(() => calls.push(name))

  const withTransaction = SqlClient.makeWithTransaction({
    transactionService,
    spanAttributes: [],
    acquireConnection: Effect.flatMap(Scope.make(), (scope) =>
      Effect.as(
        Effect.flatMap(
          record("acquireConnection"),
          () =>
            Scope.addFinalizer(scope, Effect.andThen(record("closeConnection"), options.closeConnection ?? Effect.void))
        ),
        [scope, conn] as const
      )),
    begin: () =>
      Effect.flatMap(record("begin"), () => {
        if (options.begin !== undefined) {
          return Effect.fail(options.begin)
        }
        transactionActive = true
        return Effect.void
      }),
    savepoint: (_conn, id) =>
      Effect.flatMap(record(`savepoint(${id})`), () => {
        if (options.savepoint !== undefined) {
          return Effect.fail(options.savepoint)
        }
        savepoints.push(id)
        return Effect.void
      }),
    commit: () =>
      Effect.flatMap(record("commit"), () =>
        options.commit !== undefined
          ? options.commit()
          : transactionActive
          ? Effect.sync(() => {
            transactionActive = false
          })
          : Effect.fail(sqlError("cannot commit - no transaction is active"))),
    onCommitFailure: onCommitFailure === undefined ?
      undefined :
      () => Effect.andThen(record("onCommitFailure"), onCommitFailure),
    rollback: () =>
      Effect.flatMap(record("rollback"), () =>
        transactionActive
          ? Effect.sync(() => {
            transactionActive = false
          })
          : Effect.fail(sqlError("cannot rollback - no transaction is active"))),
    rollbackSavepoint: (_conn, id) =>
      Effect.flatMap(record(`rollbackSavepoint(${id})`), () => {
        if (options.rollbackSavepoint !== undefined) {
          return Effect.fail(options.rollbackSavepoint)
        }
        return savepoints.includes(id)
          ? Effect.void
          : Effect.fail(sqlError(`cannot rollback to savepoint ${id} - it does not exist`))
      }),
    releaseSavepoint: release === undefined ?
      undefined :
      (_conn, id) =>
        Effect.flatMap(record(`releaseSavepoint(${id})`), () => release === true ? Effect.void : Effect.fail(release))
  })

  const afterCommit = SqlClient.makeAfterCommit(transactionService)
  /** Registers a callback that records `after(name)` when it runs. */
  const after = (name: string) => afterCommit(record(`after(${name})`))

  return { calls, withTransaction, afterCommit, after, record, transactionService } as const
}

const assertTypedFailure = <A, E>(exit: Exit.Exit<A, E>, error: E) => {
  assert.isTrue(Exit.isFailure(exit))
  if (!Exit.isFailure(exit)) {
    return
  }
  assert.isFalse(
    Cause.hasDies(exit.cause),
    `expected a typed failure but the cause contains a defect:\n${Cause.pretty(exit.cause)}`
  )
  assert.deepStrictEqual(Cause.findErrorOption(exit.cause), Option.some(error))
}

describe("SqlClient", () => {
  describe("makeWithTransaction", () => {
    it.effect("recovers a failed commit with catchTag after successful cleanup", () =>
      Effect.gen(function*() {
        const commitError = sqlError("commit rejected")
        const harness = makeHarness({
          commit: () => Effect.fail(commitError),
          onCommitFailure: () => Effect.void
        })

        const exit = yield* Effect.exit(
          harness.withTransaction(Effect.succeed("body")).pipe(
            Effect.catchTag("SqlError", (error) => Effect.succeed(error))
          )
        )

        assert.deepStrictEqual(exit, Exit.succeed(commitError))
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "commit",
          "onCommitFailure",
          "closeConnection"
        ])
      }))

    it.effect("keeps both commit and cleanup errors as defects despite typed recovery", () =>
      Effect.gen(function*() {
        const commitError = sqlError("commit rejected")
        const cleanupError = sqlError("cleanup rejected")
        const harness = makeHarness({
          commit: () => Effect.fail(commitError),
          onCommitFailure: () => Effect.fail(cleanupError)
        })

        const exit = yield* Effect.exit(
          harness.withTransaction(Effect.void).pipe(Effect.catchTag("SqlError", () => Effect.void))
        )

        assert.deepStrictEqual(exit, Exit.failCause(Cause.combine(Cause.die(commitError), Cause.die(cleanupError))))
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "commit",
          "onCommitFailure",
          "closeConnection"
        ])
      }))

    it.effect("propagates a failed begin as a typed error without rolling back", () =>
      Effect.gen(function*() {
        const beginError = sqlError("database is locked")
        const harness = makeHarness({ begin: beginError })
        let executed = false

        const exit = yield* Effect.exit(harness.withTransaction(Effect.sync(() => {
          executed = true
        })))

        assertTypedFailure(exit, beginError)
        assert.isFalse(executed)
        assert.deepStrictEqual(harness.calls, ["acquireConnection", "begin", "closeConnection"])
      }))

    it.effect("rolls back when the wrapped effect fails after a successful begin", () =>
      Effect.gen(function*() {
        const harness = makeHarness()

        const exit = yield* Effect.exit(harness.withTransaction(Effect.fail("boom" as const)))

        assertTypedFailure(exit, "boom" as const)
        assert.deepStrictEqual(harness.calls, ["acquireConnection", "begin", "rollback", "closeConnection"])
      }))

    it.effect("propagates a failed savepoint as a typed error without rolling back", () =>
      Effect.gen(function*() {
        const savepointError = sqlError("cannot create savepoint")
        const harness = makeHarness({ savepoint: savepointError })
        let executed = false

        const exit = yield* Effect.exit(harness.withTransaction(
          harness.withTransaction(Effect.sync(() => {
            executed = true
          }))
        ))

        assertTypedFailure(exit, savepointError)
        assert.isFalse(executed)
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "savepoint(1)",
          "rollback",
          "closeConnection"
        ])
      }))

    it.effect("releases savepoints after nested transactions succeed or roll back", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ releaseSavepoint: true })

        const exit = yield* harness.withTransaction(Effect.gen(function*() {
          yield* harness.withTransaction(Effect.void)
          return yield* Effect.exit(harness.withTransaction(Effect.fail("boom" as const)))
        }))

        assertTypedFailure(exit, "boom" as const)
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "savepoint(1)",
          "releaseSavepoint(1)",
          "savepoint(1)",
          "rollbackSavepoint(1)",
          "releaseSavepoint(1)",
          "commit",
          "closeConnection"
        ])
      }))

    it.effect("does not release savepoints when the driver does not opt in", () =>
      Effect.gen(function*() {
        const harness = makeHarness()

        const result = yield* harness.withTransaction(harness.withTransaction(Effect.succeed(1)))

        assert.strictEqual(result, 1)
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "savepoint(1)",
          "commit",
          "closeConnection"
        ])
      }))

    it.effect("skips savepoint release when rollback fails", () =>
      Effect.gen(function*() {
        const rollbackError = sqlError("cannot roll back savepoint")
        const harness = makeHarness({ releaseSavepoint: true, rollbackSavepoint: rollbackError })

        const exit = yield* Effect.exit(harness.withTransaction(harness.withTransaction(Effect.fail("boom"))))

        assert.deepStrictEqual(exit, Exit.failCause(Cause.combine(Cause.fail("boom"), Cause.die(rollbackError))))
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "savepoint(1)",
          "rollbackSavepoint(1)",
          "rollback",
          "closeConnection"
        ])
      }))

    it.effect("rolls back the outer transaction when a savepoint release fails", () =>
      Effect.gen(function*() {
        const releaseError = sqlError("cannot release savepoint")
        const harness = makeHarness({ releaseSavepoint: releaseError })

        const exit = yield* Effect.exit(harness.withTransaction(harness.withTransaction(Effect.void)))

        assert.deepStrictEqual(exit, Exit.die(releaseError))
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "savepoint(1)",
          "releaseSavepoint(1)",
          "rollback",
          "closeConnection"
        ])
      }))

    it.effect("commits and returns the value when the wrapped effect succeeds", () =>
      Effect.gen(function*() {
        const harness = makeHarness()

        const result = yield* harness.withTransaction(Effect.succeed(1))

        assert.strictEqual(result, 1)
        assert.deepStrictEqual(harness.calls, ["acquireConnection", "begin", "commit", "closeConnection"])
      }))
  })

  describe("afterCommit", () => {
    it.effect("runs callbacks in order after the commit and the connection's release", () =>
      Effect.gen(function*() {
        const harness = makeHarness()

        const result = yield* harness.withTransaction(
          Effect.andThen(Effect.andThen(harness.after("1"), harness.after("2")), Effect.succeed("body"))
        )

        assert.strictEqual(result, "body")
        assert.deepStrictEqual(harness.calls, [
          "acquireConnection",
          "begin",
          "commit",
          "closeConnection",
          "after(1)",
          "after(2)"
        ])
      }))

    it.effect("runs nothing when the transaction rolls back", () =>
      Effect.gen(function*() {
        const harness = makeHarness()

        yield* Effect.exit(harness.withTransaction(Effect.andThen(harness.after("1"), Effect.fail("boom"))))

        assert.deepStrictEqual(harness.calls, ["acquireConnection", "begin", "rollback", "closeConnection"])
      }))

    it.effect("runs nothing when COMMIT fails", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ commit: () => Effect.fail(sqlError("commit rejected")) })

        yield* Effect.exit(harness.withTransaction(harness.after("1")))

        assert.isFalse(harness.calls.includes("after(1)"))
      }))

    it.effect("keeps registration order across savepoints", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ releaseSavepoint: true })

        yield* harness.withTransaction(Effect.gen(function*() {
          yield* harness.after("1")
          yield* harness.withTransaction(harness.after("2"))
          yield* harness.after("3")
        }))

        assert.deepStrictEqual(harness.calls.filter((call) => call.startsWith("after")), [
          "after(1)",
          "after(2)",
          "after(3)"
        ])
      }))

    it.effect("keeps registration order across fibers and savepoints", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ releaseSavepoint: true })
        const registered = yield* Deferred.make<void>()
        const finish = yield* Deferred.make<void>()

        yield* harness.withTransaction(Effect.gen(function*() {
          const child = yield* Effect.forkChild(harness.withTransaction(Effect.gen(function*() {
            yield* harness.after("1")
            yield* Deferred.succeed(registered, undefined)
            yield* Deferred.await(finish)
          })))
          yield* Deferred.await(registered)
          yield* harness.after("2")
          yield* Deferred.succeed(finish, undefined)
          yield* Fiber.join(child)
        }))

        assert.deepStrictEqual(harness.calls.filter((call) => call.startsWith("after")), ["after(1)", "after(2)"])
      }))

    it.effect("discards the callbacks of a savepoint that rolls back, and runs the rest", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ releaseSavepoint: true })

        yield* harness.withTransaction(Effect.gen(function*() {
          yield* harness.after("outer")
          yield* Effect.exit(harness.withTransaction(Effect.andThen(harness.after("inner"), Effect.fail("boom"))))
        }))

        assert.deepStrictEqual(harness.calls.filter((call) => call.startsWith("after")), ["after(outer)"])
      }))

    it.effect("discards the callbacks of a savepoint inside a savepoint that rolls back", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ releaseSavepoint: true })

        yield* harness.withTransaction(Effect.gen(function*() {
          yield* Effect.exit(harness.withTransaction(Effect.gen(function*() {
            yield* harness.withTransaction(harness.after("inner"))
            return yield* Effect.fail("boom")
          })))
          yield* harness.after("outer")
        }))

        assert.deepStrictEqual(harness.calls.filter((call) => call.startsWith("after")), ["after(outer)"])
      }))

    it.effect("runs nothing when the outer transaction rolls back after a savepoint commits", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ releaseSavepoint: true })

        yield* Effect.exit(harness.withTransaction(Effect.gen(function*() {
          yield* harness.withTransaction(harness.after("inner"))
          return yield* Effect.fail("boom")
        })))

        assert.isFalse(harness.calls.includes("after(inner)"))
      }))

    it.effect("runs immediately when no transaction is open", () =>
      Effect.gen(function*() {
        const harness = makeHarness()

        yield* harness.after("1")

        assert.deepStrictEqual(harness.calls, ["after(1)"])
      }))

    it.effect("runs immediately in another client's transaction", () =>
      Effect.gen(function*() {
        const harness = makeHarness()
        const other = makeHarness()

        const ranInside = yield* other.withTransaction(
          Effect.andThen(harness.after("1"), Effect.sync(() => harness.calls.includes("after(1)")))
        )

        assert.isTrue(ranInside)
      }))

    it.effect("runs callbacks without the transaction in their context", () =>
      Effect.gen(function*() {
        const harness = makeHarness()
        const seen: Array<boolean> = []

        yield* harness.withTransaction(harness.afterCommit(
          Effect.flatMap(Effect.serviceOption(harness.transactionService), (transaction) =>
            Effect.sync(() => {
              seen.push(Option.isSome(transaction))
            }))
        ))

        assert.deepStrictEqual(seen, [false])
      }))

    it.effect("runs a callback registered by a callback immediately", () =>
      Effect.gen(function*() {
        const harness = makeHarness()

        yield* harness.withTransaction(harness.afterCommit(
          Effect.andThen(harness.after("nested"), harness.record("after(outer)"))
        ))

        assert.deepStrictEqual(harness.calls.filter((call) => call.startsWith("after")), [
          "after(nested)",
          "after(outer)"
        ])
      }))

    it.effect("logs a callback that dies and runs the rest", () =>
      Effect.gen(function*() {
        const harness = makeHarness()
        const logged: Array<string> = []
        const logger = Logger.make<unknown, void>((options) => {
          logged.push(`${options.logLevel}: ${Cause.pretty(options.cause)}`)
        })

        const result = yield* harness.withTransaction(Effect.gen(function*() {
          yield* harness.afterCommit(Effect.die("callback defect"))
          yield* harness.after("2")
          return "body"
        })).pipe(Effect.provide(Logger.layer([logger])))

        assert.strictEqual(result, "body")
        assert.isTrue(harness.calls.includes("after(2)"))
        assert.strictEqual(logged.length, 1)
        assert.include(logged[0], "Error")
        assert.include(logged[0], "callback defect")
      }))

    it.effect("runs callbacks after COMMIT even if the fiber is interrupted during it", () =>
      Effect.gen(function*() {
        const committing = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const harness = makeHarness({
          commit: () => Effect.andThen(Deferred.succeed(committing, undefined), Deferred.await(release))
        })

        const fiber = yield* Effect.forkChild(harness.withTransaction(harness.after("1")))
        yield* Deferred.await(committing)
        const interrupting = yield* Effect.forkChild(Fiber.interrupt(fiber))
        yield* Effect.yieldNow
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(interrupting)

        assert.isTrue(harness.calls.includes("after(1)"))
      }))

    it.effect("runs callbacks after COMMIT even if releasing the connection fails", () =>
      Effect.gen(function*() {
        const harness = makeHarness({ closeConnection: Effect.die("release defect") })

        const exit = yield* Effect.exit(harness.withTransaction(harness.after("1")))

        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause))
        assert.deepStrictEqual(harness.calls, ["acquireConnection", "begin", "commit", "closeConnection", "after(1)"])
      }))

    it.effect("dies when registering on a transaction that has ended", () =>
      Effect.gen(function*() {
        const harness = makeHarness()
        const go = yield* Deferred.make<void>()

        const late = yield* harness.withTransaction(
          Effect.forkDetach(Effect.andThen(Deferred.await(go), harness.after("late")))
        )
        yield* Deferred.succeed(go, undefined)
        const exit = yield* Fiber.await(late)

        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause))
        assert.isFalse(harness.calls.includes("after(late)"))
      }))
  })
})
