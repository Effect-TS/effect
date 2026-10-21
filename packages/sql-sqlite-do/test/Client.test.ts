import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import * as Reactivity from "@effect/experimental/Reactivity"
import { SqliteClient } from "@effect/sql-sqlite-do"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber } from "effect"

// Mirrors workerd: transaction statements are rejected by `SqlStorage.exec`
const transactionSql = /^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/i

class FakeCursor {
  readonly columnNames: ReadonlyArray<string>
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>

  constructor(rows: ReadonlyArray<Record<string, unknown>>, columns?: ReadonlyArray<string>) {
    this.columnNames = columns ?? Object.keys(rows[0] ?? {})
    this.rows = rows.map((row) => this.columnNames.map((column) => row[column]))
  }

  *raw() {
    yield* this.rows.map((row) => [...row])
  }
}

class FakeSqlStorage {
  readonly statements: Array<string> = []
  tables = new Map<string, Array<Record<string, unknown>>>()

  snapshot() {
    return new Map(Array.from(this.tables, ([table, rows]) => [table, rows.map((row) => ({ ...row }))]))
  }

  exec(sql: string) {
    this.statements.push(sql)
    const statement = sql.replace(/\s+/g, " ").trim()
    if (transactionSql.test(statement)) {
      throw new Error(`Unsupported transaction SQL: ${statement}`)
    }
    const create = /^CREATE TABLE (\w+)/i.exec(statement)
    if (create !== null) {
      this.tables.set(create[1], [])
      return new FakeCursor([])
    }
    const insert = /^INSERT INTO (\w+) \(name\) VALUES \('([^']*)'\)$/i.exec(statement)
    if (insert !== null) {
      const rows = this.tables.get(insert[1])!
      rows.push({ id: rows.length + 1, name: insert[2] })
      return new FakeCursor([])
    }
    const select = /^SELECT \* FROM (\w+)$/i.exec(statement)
    if (select !== null) {
      return new FakeCursor(this.tables.get(select[1]) ?? [], ["id", "name"])
    }
    return new FakeCursor([])
  }
}

class FakeDurableObjectStorage {
  readonly sql = new FakeSqlStorage()
  transactionCalls = 0
  rollbackCalls = 0

  transaction<T>(body: (txn: { rollback: () => void }) => Promise<T>): Promise<T> {
    this.transactionCalls++
    const snapshot = this.sql.snapshot()
    let rolledBack = false
    const txn = {
      rollback: () => {
        this.rollbackCalls++
        rolledBack = true
      }
    }
    return Promise.resolve().then(() => body(txn)).then(
      (value) => {
        if (rolledBack) {
          this.sql.tables = snapshot
        }
        return value
      },
      (error) => {
        this.sql.tables = snapshot
        throw error
      }
    )
  }
}

const makeClient = (storage: FakeDurableObjectStorage) =>
  SqliteClient.make({
    db: storage.sql as unknown as SqlStorage,
    storage: storage as unknown as DurableObjectStorage
  } as SqliteClient.SqliteClientConfig).pipe(
    Effect.provide(Reactivity.layer)
  )

const hasTransactionSql = (storage: FakeDurableObjectStorage) =>
  storage.sql.statements.some((statement) => transactionSql.test(statement.trim()))

describe("Client", () => {
  it.scoped("withTransaction commits through DurableObjectStorage.transaction", () =>
    Effect.gen(function*() {
      const storage = new FakeDurableObjectStorage()
      const sql = yield* makeClient(storage)

      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql.withTransaction(sql`INSERT INTO test (name) VALUES ('hello')`)

      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [{ id: 1, name: "hello" }])
      assert.strictEqual(storage.transactionCalls, 1)
      assert.isFalse(hasTransactionSql(storage))
    }))

  it.scoped("withTransaction rolls back on failure and re-emits the original error", () =>
    Effect.gen(function*() {
      const storage = new FakeDurableObjectStorage()
      const sql = yield* makeClient(storage)

      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      const error = yield* sql`INSERT INTO test (name) VALUES ('hello')`.pipe(
        Effect.andThen(Effect.fail("boom")),
        sql.withTransaction,
        Effect.flip
      )

      assert.strictEqual(error, "boom")
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [])
      assert.strictEqual(storage.rollbackCalls, 1)
      assert.isFalse(hasTransactionSql(storage))
    }))

  it.scoped("withTransaction rolls back on interruption", () =>
    Effect.gen(function*() {
      const storage = new FakeDurableObjectStorage()
      const sql = yield* makeClient(storage)
      const inserted = yield* Deferred.make<void>()

      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      const fiber = yield* sql`INSERT INTO test (name) VALUES ('hello')`.pipe(
        Effect.zipRight(Deferred.succeed(inserted, void 0)),
        Effect.zipRight(Effect.never),
        sql.withTransaction,
        Effect.fork
      )
      // Surface an early transaction failure instead of waiting forever
      yield* Effect.raceFirst(Deferred.await(inserted), Fiber.join(fiber))
      yield* Fiber.interrupt(fiber)

      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [])
      assert.strictEqual(storage.rollbackCalls, 1)
    }))

  it.scoped("nested withTransaction commits inner and outer writes", () =>
    Effect.gen(function*() {
      const storage = new FakeDurableObjectStorage()
      const sql = yield* makeClient(storage)

      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql.withTransaction(Effect.gen(function*() {
        yield* sql`INSERT INTO test (name) VALUES ('outer')`
        yield* sql.withTransaction(sql`INSERT INTO test (name) VALUES ('inner')`)
        yield* sql`INSERT INTO test (name) VALUES ('after')`
      }))

      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [
        { id: 1, name: "outer" },
        { id: 2, name: "inner" },
        { id: 3, name: "after" }
      ])
      assert.strictEqual(storage.transactionCalls, 2)
      assert.strictEqual(storage.rollbackCalls, 0)
      assert.isFalse(hasTransactionSql(storage))
    }))

  it.scoped("caught nested failure rolls back only the inner writes", () =>
    Effect.gen(function*() {
      const storage = new FakeDurableObjectStorage()
      const sql = yield* makeClient(storage)

      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql.withTransaction(Effect.gen(function*() {
        yield* sql`INSERT INTO test (name) VALUES ('outer')`
        const error = yield* sql`INSERT INTO test (name) VALUES ('inner')`.pipe(
          Effect.andThen(Effect.fail("inner failure")),
          sql.withTransaction,
          Effect.flip
        )
        assert.strictEqual(error, "inner failure")
        yield* sql`INSERT INTO test (name) VALUES ('after')`
      }))

      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [
        { id: 1, name: "outer" },
        { id: 2, name: "after" }
      ])
      assert.strictEqual(storage.transactionCalls, 2)
      assert.strictEqual(storage.rollbackCalls, 1)
      assert.isFalse(hasTransactionSql(storage))
    }))
})
