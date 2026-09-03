import { LibsqlClient } from "@effect/sql-libsql"
import { assert, describe, it } from "@effect/vitest"
import * as Libsql from "@libsql/client"
import { Effect, Exit } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const fixture = Effect.gen(function*() {
  const directory = yield* Effect.acquireRelease(
    Effect.sync(() => mkdtempSync(join(import.meta.dirname, ".transaction-isolation-"))),
    (directory) => Effect.sync(() => rmSync(directory, { recursive: true }))
  )
  const urls = ["a.db", "b.db"].map((name) => pathToFileURL(join(directory, name)).href)
  const a = yield* LibsqlClient.make({ url: urls[0], transformResultNames: (name) => name.toUpperCase() })
  const b = yield* LibsqlClient.make({ url: urls[1], transformResultNames: (name) => name.toUpperCase() })
  for (const [sql, owner] of [[a, "A"], [b, "B"]] as const) {
    yield* sql`CREATE TABLE marker (owner TEXT NOT NULL)`
    yield* sql`INSERT INTO marker VALUES (${owner})`
    assert.deepStrictEqual(yield* sql`SELECT owner FROM marker`, [{ OWNER: owner }])
  }
  return { a, b, urls }
})

describe("native libSQL client transaction isolation", () => {
  it("executes a query with the installed native SDK", async () => {
    const sdk = Libsql.createClient({ url: ":memory:" })
    try {
      const rows = (await sdk.execute("SELECT sqlite_version() AS version")).rows
      assert.isString(rows[0].version)
    } finally {
      sdk.close()
      assert.isTrue(sdk.closed)
    }
  })

  it.effect("distinct file databases and outside-transaction queries remain distinct", () =>
    Effect.gen(function*() {
      const { a, b, urls } = yield* fixture
      const aFiles = yield* a`PRAGMA database_list`
      const bFiles = yield* b`PRAGMA database_list`
      assert.notStrictEqual(aFiles[0].FILE, bFiles[0].FILE)
      assert.deepStrictEqual([
        pathToFileURL(aFiles[0].FILE as string).href,
        pathToFileURL(bFiles[0].FILE as string).href
      ], urls)
      assert.deepStrictEqual(yield* a.withTransaction(a`SELECT owner FROM marker`), [{ OWNER: "A" }])
      assert.deepStrictEqual(yield* b`SELECT owner FROM marker`, [{ OWNER: "B" }])
      assert.deepStrictEqual(yield* b.withTransaction(b`SELECT owner FROM marker`), [{ OWNER: "B" }])
      assert.deepStrictEqual(yield* a`SELECT owner FROM marker`, [{ OWNER: "A" }])
    }).pipe(Effect.provide(Reactivity.layer)))

  for (const direction of ["A-to-B", "B-to-A"] as const) {
    it.effect(`${direction}: foreign transaction must not redirect reads`, () =>
      Effect.gen(function*() {
        const { a, b } = yield* fixture
        const [outer, inner, owner] = direction === "A-to-B" ? [a, b, "B"] as const : [b, a, "A"] as const
        assert.deepStrictEqual(yield* outer.withTransaction(inner`SELECT owner FROM marker`), [{ OWNER: owner }])
        assert.deepStrictEqual(yield* inner`SELECT owner FROM marker`, [{ OWNER: owner }])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect(`${direction}: foreign transaction must not redirect writes`, () =>
      Effect.gen(function*() {
        const { a, b } = yield* fixture
        const [outer, inner, outerOwner] = direction === "A-to-B" ? [a, b, "A"] as const : [b, a, "B"] as const
        yield* outer.withTransaction(inner`UPDATE marker SET owner = 'written'`)
        assert.deepStrictEqual(yield* inner`SELECT owner FROM marker`, [{ OWNER: "written" }])
        assert.deepStrictEqual(yield* outer`SELECT owner FROM marker`, [{ OWNER: outerOwner }])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect(`${direction}: inner client's commit is independent of outer rollback`, () =>
      Effect.gen(function*() {
        const { a, b } = yield* fixture
        const [outer, inner, outerOwner] = direction === "A-to-B" ? [a, b, "A"] as const : [b, a, "B"] as const
        const exit = yield* outer.withTransaction(Effect.gen(function*() {
          yield* inner.withTransaction(inner`UPDATE marker SET owner = 'committed'`)
          return yield* Effect.fail("rollback outer")
        })).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(exit))
        assert.deepStrictEqual(yield* inner`SELECT owner FROM marker`, [{ OWNER: "committed" }])
        assert.deepStrictEqual(yield* outer`SELECT owner FROM marker`, [{ OWNER: outerOwner }])
      }).pipe(Effect.provide(Reactivity.layer)))
  }

  it.effect("same-client nested success commits", () =>
    Effect.gen(function*() {
      const { a } = yield* fixture
      yield* a.withTransaction(Effect.gen(function*() {
        yield* a`INSERT INTO marker VALUES ('outer')`
        yield* a.withTransaction(a`INSERT INTO marker VALUES ('inner')`)
      }))
      assert.deepStrictEqual(yield* a`SELECT owner FROM marker ORDER BY rowid`, [{ OWNER: "A" }, { OWNER: "outer" }, {
        OWNER: "inner"
      }])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("same-client nested rollback preserves outer write", () =>
    Effect.gen(function*() {
      const { a } = yield* fixture
      yield* a.withTransaction(Effect.gen(function*() {
        yield* a`INSERT INTO marker VALUES ('outer')`
        const inner = yield* a.withTransaction(
          a`INSERT INTO marker VALUES ('inner')`.pipe(Effect.andThen(Effect.fail("rollback inner")))
        ).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(inner))
      }))
      assert.deepStrictEqual(yield* a`SELECT owner FROM marker ORDER BY rowid`, [{ OWNER: "A" }, { OWNER: "outer" }])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("outer rollback undoes successful same-client nested write", () =>
    Effect.gen(function*() {
      const { a } = yield* fixture
      const exit = yield* a.withTransaction(
        a.withTransaction(a`INSERT INTO marker VALUES ('inner')`).pipe(Effect.andThen(Effect.fail("rollback outer")))
      ).pipe(Effect.exit)
      assert.isTrue(Exit.isFailure(exit))
      assert.deepStrictEqual(yield* a`SELECT owner FROM marker`, [{ OWNER: "A" }])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("withoutTransforms view shares transaction and nested rollback", () =>
    Effect.gen(function*() {
      const { a } = yield* fixture
      const raw = a.withoutTransforms()
      assert.notStrictEqual(raw, a)
      assert.strictEqual(raw.transactionService, a.transactionService)
      yield* a.withTransaction(Effect.gen(function*() {
        yield* raw`UPDATE marker SET owner = 'outer'`
        assert.deepStrictEqual(yield* a`SELECT owner FROM marker`, [{ OWNER: "outer" }])
        const inner = yield* raw.withTransaction(
          raw`UPDATE marker SET owner = 'inner'`.pipe(Effect.andThen(Effect.fail("rollback view")))
        ).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(inner))
        assert.deepStrictEqual(yield* raw`SELECT owner FROM marker`, [{ owner: "outer" }])
      }))
      assert.deepStrictEqual(yield* raw.withTransaction(a`SELECT owner FROM marker`), [{ OWNER: "outer" }])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.live("failed SDK begin releases permit; caller-owned SDK remains usable", () =>
    Effect.gen(function*() {
      const { urls } = yield* fixture
      const sdk = yield* Effect.acquireRelease(Effect.sync(() => Libsql.createClient({ url: urls[0] })), (sdk) =>
        Effect.sync(() => sdk.close()))
      let attempts = 0
      const liveClient = new Proxy(sdk, {
        get(target, key) {
          if (key === "transaction") {
            return (...args: Parameters<typeof sdk.transaction>) =>
              ++attempts === 1
                ? Promise.reject(new Error("injected begin failure"))
                : sdk.transaction(...args)
          }
          const value = Reflect.get(target, key)
          return typeof value === "function" ? value.bind(target) : value
        }
      })
      yield* Effect.scoped(Effect.gen(function*() {
        const client = yield* LibsqlClient.make({ liveClient })
        assert.isTrue(Exit.isFailure(yield* client.withTransaction(Effect.void).pipe(Effect.exit)))
        assert.deepStrictEqual(
          yield* client.withTransaction(client`SELECT owner FROM marker`).pipe(Effect.timeout("2 seconds")),
          [{ owner: "A" }]
        )
        assert.strictEqual(attempts, 2)
      }))
      assert.isFalse(sdk.closed)
      assert.deepStrictEqual(
        (yield* Effect.promise(() =>
          sdk.execute("SELECT owner FROM marker")
        )).rows.map((row) => ({
          owner: row.owner
        })),
        [{ owner: "A" }]
      )
    }).pipe(Effect.provide(Reactivity.layer)))
})
