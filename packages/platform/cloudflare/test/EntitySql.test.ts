import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import { makeEntityKeepAlive } from "@effect/platform-cloudflare/internal/entityKeepAlive"
import { registerEntity, unregisterEntity } from "@effect/platform-cloudflare/internal/entityRegistry"
import type { EntityRegistration } from "@effect/platform-cloudflare/internal/entityRegistry"
import { makeEntityManager } from "@effect/platform-cloudflare/internal/entityRuntime"
import { ensureEntityStorage } from "@effect/platform-cloudflare/internal/entityStorage"
import * as SqliteClient from "@effect/sql-sqlite-do/SqliteClient"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Schema, Scope } from "effect"
import { ClusterSchema, Entity, EntityAddress, EntityId, EntityType, ShardId } from "effect/cluster"
import * as Reactivity from "effect/reactivity/Reactivity"
import { Rpc } from "effect/rpc"
import { SqlClient } from "effect/sql"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"

// Durable Object storage over node:sqlite. Both transaction APIs use
// savepoints so the cluster's `transactionSync` and `SqliteClient`'s
// `transaction` can nest, as they do on SQLite-backed Durable Objects.
class SqliteStorage {
  readonly sql: SqlStorage
  #savepoints = 0

  constructor(readonly database: DatabaseSync) {
    this.sql = {
      exec: (query: string, ...bindings: Array<unknown>) => {
        const statement = database.prepare(query)
        const columnNames = statement.columns().map((column) => column.name)
        const rows = statement.all(...bindings as Array<SQLInputValue>) as Array<Record<string, unknown>>
        return {
          columnNames,
          toArray: () => rows,
          raw: () => rows.map((row) => columnNames.map((column) => row[column]))[Symbol.iterator]()
        }
      }
    } as unknown as SqlStorage
  }

  #begin(): string {
    const name = `sp_${this.#savepoints++}`
    this.database.exec(`SAVEPOINT ${name}`)
    return name
  }

  #end(name: string, commit: boolean): void {
    if (!commit) this.database.exec(`ROLLBACK TO ${name}`)
    this.database.exec(`RELEASE ${name}`)
  }

  transactionSync<A>(f: () => A): A {
    const name = this.#begin()
    try {
      const value = f()
      this.#end(name, true)
      return value
    } catch (error) {
      this.#end(name, false)
      throw error
    }
  }

  async transaction<A>(f: (txn: { readonly rollback: () => void }) => Promise<A>): Promise<A> {
    const name = this.#begin()
    let rolledBack = false
    try {
      const value = await f({
        rollback: () => {
          rolledBack = true
        }
      })
      this.#end(name, !rolledBack)
      return value
    } catch (error) {
      this.#end(name, false)
      throw error
    }
  }
}

const Notes = Entity.make("Notes", [
  Rpc.make("Save", {
    payload: { ids: Schema.Array(Schema.String), fail: Schema.Boolean },
    success: Schema.Number,
    error: Schema.String
  }).annotate(ClusterSchema.Persisted, true),
  Rpc.make("List", { success: Schema.Array(Schema.String) }),
  Rpc.make("Audit", { payload: { id: Schema.String } })
])

// The Worker layer's own database, standing in for an app-wide client such as
// D1. It must stay reachable as `SqlClient` inside entity handlers.
const appDatabase = new DatabaseSync(":memory:")
appDatabase.exec("CREATE TABLE audit (id TEXT NOT NULL)")
const appScope = Scope.makeUnsafe()
const appSql = Effect.runSync(
  SqliteClient.make({ storage: new SqliteStorage(appDatabase) as unknown as DurableObjectStorage }).pipe(
    Effect.provide(Reactivity.layer),
    Effect.provideService(Scope.Scope, appScope)
  )
)

// The build creates the table and every handler queries through the
// `DurableObjectSqlClient` the entity Durable Object provides.
const registration: EntityRegistration = {
  entity: Notes,
  build: Effect.gen(function*() {
    const sql = yield* CloudflareCluster.DurableObjectSqlClient
    yield* sql`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY)`
    return Notes.of({
      Save: ({ payload }) =>
        sql.withTransaction(Effect.gen(function*() {
          for (const id of payload.ids) {
            yield* sql`INSERT INTO notes (id) VALUES (${id})`
          }
          if (payload.fail) return yield* Effect.fail("rejected")
          return payload.ids.length
        })).pipe(Effect.catchTag("SqlError", Effect.die)),
      List: () =>
        sql<{ readonly id: string }>`SELECT id FROM notes ORDER BY id`.pipe(
          Effect.map((rows) => rows.map((row) => row.id)),
          Effect.orDie
        ),
      Audit: ({ payload }) =>
        Effect.flatMap(SqlClient.SqlClient, (app) => app`INSERT INTO audit (id) VALUES (${payload.id})`).pipe(
          Effect.asVoid,
          Effect.orDie
        )
    })
  }).pipe(Effect.orDie) as unknown as EntityRegistration["build"],
  options: undefined,
  context: Context.make(SqlClient.SqlClient, appSql)
}

const addressFor = (entityId: string) =>
  EntityAddress.make({
    shardId: ShardId.make("default", 1),
    entityType: EntityType.make(Notes.type),
    entityId: EntityId.make(entityId)
  })

let requestCount = 0
const nextRequestId = () => `0198bd72-6a80-72f1-8d87-${String(requestCount++).padStart(12, "0")}`

const makeNotes = Effect.fnUntraced(function*(entityId: string) {
  const database = yield* Effect.acquireRelease(
    Effect.sync(() => new DatabaseSync(":memory:")),
    (database) => Effect.sync(() => database.close())
  )
  const storage = new SqliteStorage(database)
  ensureEntityStorage(storage.sql)
  const address = addressFor(entityId)
  const manager = makeEntityManager({
    storage: storage as unknown as DurableObjectStorage,
    address,
    entityName: `${Notes.type.length}:${Notes.type}${entityId}`,
    keepAlive: makeEntityKeepAlive(() => Promise.resolve()),
    waitUntil: (effect) => {
      Effect.runFork(effect)
    },
    getNamespace: () => undefined
  })

  const ask = Effect.fnUntraced(function*(
    tag: "Save" | "List" | "Audit",
    payload: unknown,
    requestId = nextRequestId()
  ) {
    const result = yield* manager.invoke(
      JSON.stringify({ _tag: "Request", requestId, address, tag, payload, headers: {} }),
      false
    )
    assert.strictEqual(result._tag, "Success")
    const reply = JSON.parse(result._tag === "Success" ? result.replies[0] : "null")
    assert.strictEqual(reply?._tag, "WithExit")
    return reply.exit as { readonly _tag: "Success"; readonly value: any } | { readonly _tag: "Failure" }
  })

  return {
    manager,
    save: (ids: ReadonlyArray<string>, options?: { readonly fail?: boolean; readonly requestId?: string }) =>
      ask("Save", { ids, fail: options?.fail ?? false }, options?.requestId),
    list: Effect.map(ask("List", null), (exit) => exit._tag === "Success" ? exit.value : exit),
    audit: (id: string) => ask("Audit", { id })
  }
})

describe("Entity DurableObjectSqlClient", () => {
  beforeAll(() => {
    assert.isTrue(registerEntity(Notes.type, registration))
  })
  afterAll(() => {
    unregisterEntity(Notes.type, registration)
    Effect.runSync(Scope.close(appScope, Exit.void))
    appDatabase.close()
  })

  it.effect("gives the handler build and handlers a client on the entity's own storage", () =>
    Effect.gen(function*() {
      const first = yield* makeNotes("first")
      const second = yield* makeNotes("second")

      assert.deepStrictEqual(yield* first.save(["a", "b"]), { _tag: "Success", value: 2 })
      assert.deepStrictEqual(yield* first.list, ["a", "b"])
      assert.deepStrictEqual(yield* second.list, [], "Rows leaked into another entity's Durable Object")
    }))

  it.effect("commits a handler transaction atomically and rolls it back on failure", () =>
    Effect.gen(function*() {
      const notes = yield* makeNotes("transactions")

      const failed = yield* notes.save(["a", "b"], { fail: true })
      assert.strictEqual(failed._tag, "Failure")
      assert.deepStrictEqual(yield* notes.list, [], "A failed transaction left partial rows behind")

      assert.deepStrictEqual(yield* notes.save(["c", "d"]), { _tag: "Success", value: 2 })
      assert.deepStrictEqual(yield* notes.list, ["c", "d"])
    }))

  it.effect("keeps user rows when the cluster resets a request", () =>
    Effect.gen(function*() {
      const notes = yield* makeNotes("reset")
      const requestId = nextRequestId()

      assert.deepStrictEqual(yield* notes.save(["a"], { requestId }), { _tag: "Success", value: 1 })
      yield* notes.manager.reset(requestId)

      assert.deepStrictEqual(yield* notes.list, ["a"], "reset removed rows from a user table")
    }))

  it.effect("leaves the Worker layer's SqlClient reachable inside handlers", () =>
    Effect.gen(function*() {
      const notes = yield* makeNotes("audit")

      assert.deepStrictEqual(yield* notes.audit("a"), { _tag: "Success", value: null })

      const rows = appDatabase.prepare("SELECT id FROM audit").all()
      assert.deepStrictEqual(
        rows.map((row) => row.id),
        ["a"],
        "The entity client shadowed the app-wide SqlClient"
      )
    }))
})
