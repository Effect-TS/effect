import { mysqlNativeCommit } from "@effect/auth-persistence-drizzle/internal/drizzle/transactionMysql"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Result from "effect/Result"
import * as SqlClient from "effect/sql/SqlClient"
import type * as SqlConnection from "effect/sql/SqlConnection"
import * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"

const makeClient = Effect.fnUntraced(function*() {
  const calls: Array<string> = []
  const execute = (statement: string) =>
    Effect.sync(() => {
      calls.push(statement)
      return statement.includes("@@session.transaction_isolation")
        ? [{ isolation: "REPEATABLE-READ" }]
        : []
    })
  const connection: SqlConnection.Connection & {
    readonly conn: { readonly destroy: () => void; readonly release: () => void }
  } = {
    conn: {
      destroy: () => {
        calls.push("destroy")
      },
      release: () => {
        calls.push("release")
      }
    },
    execute,
    executeRaw: execute,
    executeUnprepared: execute,
    executeValues: () => Effect.succeed([]),
    executeValuesUnprepared: () => Effect.succeed([]),
    executeStream: (statement) => Stream.fromEffect(execute(statement))
  }
  const client = yield* SqlClient.make({
    driver: "mysql2",
    acquirer: Effect.acquireRelease(
      Effect.sync(() => {
        calls.push("acquire")
        return connection
      }),
      () => Effect.sync(connection.conn.release)
    ),
    compiler: Statement.makeCompilerSqlite(),
    spanAttributes: []
  })
  return { client, connection, calls }
})

it.effect("uses one reserved connection for MySQL transaction queries and cleanup", () =>
  Effect.gen(function*() {
    const { calls, client, connection } = yield* makeClient()
    yield* mysqlNativeCommit(client).withTransaction(
      Effect.gen(function*() {
        const active = yield* Effect.serviceOption(client.transactionService)
        assert.isTrue(Option.isSome(active))
        if (Option.isSome(active)) assert.strictEqual(active.value[0], connection)
        yield* client`select 1`
      })
    )
    assert.deepStrictEqual(calls, [
      "acquire",
      "select @@session.transaction_isolation as isolation",
      "SET TRANSACTION ISOLATION LEVEL READ COMMITTED",
      "BEGIN",
      "select 1",
      "COMMIT",
      "ROLLBACK",
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ",
      "release"
    ])
  }).pipe(Effect.provide(Reactivity.layer)))

it.effect("rolls back a failed MySQL transaction before releasing its reserved connection", () =>
  Effect.gen(function*() {
    const { calls, client } = yield* makeClient()
    const result = yield* mysqlNativeCommit(client).withTransaction(
      client`select 1`.pipe(Effect.andThen(Effect.fail("rejected")))
    ).pipe(Effect.result)
    assert.isTrue(Result.isFailure(result))
    if (Result.isFailure(result)) assert.strictEqual(result.failure, "rejected")
    assert.deepStrictEqual(calls.slice(3), [
      "BEGIN",
      "select 1",
      "ROLLBACK",
      "ROLLBACK",
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ",
      "release"
    ])
  }).pipe(Effect.provide(Reactivity.layer)))
