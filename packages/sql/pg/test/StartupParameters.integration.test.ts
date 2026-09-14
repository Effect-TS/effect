import { PgClient, PgConnection, PgPool } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { PgContainer } from "./utils.ts"

const settingsQuery = "SELECT current_setting('statement_timeout') AS timeout, " +
  "current_setting('search_path') AS path, current_setting('application_name') AS app"
const expectedSettings = [{ timeout: "1234ms", path: "pg_catalog, public", app: "startup-app" }]
const namedDefaults = {
  startupParameters: {
    Statement_Timeout: "1234ms",
    SEARCH_PATH: "pg_catalog, public",
    application_name: "startup-app"
  }
}

const connectionUrl = Effect.gen(function*() {
  const container = yield* PgContainer
  return new URL(container.getConnectionUri())
})

it.layer(PgContainer.layer, { timeout: "30 seconds" })("PostgreSQL startup defaults", (it) => {
  it.effect.each(["named", "URL options", "config options", "combined"])(
    "establishes session defaults with %s",
    (source) =>
      Effect.gen(function*() {
        const url = yield* connectionUrl
        const options = "-c statement_timeout=1234 -c search_path=pg_catalog,public"
        if (source === "URL options") url.searchParams.set("options", options)
        const config = source === "named"
          ? namedDefaults
          : source === "combined"
          ? { startupParameters: { search_path: "pg_catalog,public" }, options: "-c statement_timeout=1234" }
          : source === "config options"
          ? { options }
          : {}
        const connection = yield* PgConnection.make({
          url: Redacted.make(url.toString()),
          applicationName: "startup-app",
          ...config
        })
        const result = yield* connection.query(settingsQuery)
        assert.deepStrictEqual(result.rows, [{
          timeout: "1234ms",
          path: source === "named" ? "pg_catalog, public" : "pg_catalog,public",
          app: "startup-app"
        }])
      })
  )

  it.effect.each(["named", "options"])("RESET ALL restores %s startup defaults", (source) =>
    Effect.gen(function*() {
      const config = source === "named"
        ? namedDefaults
        : { options: "-c statement_timeout=1234 -c search_path=pg_catalog,public", applicationName: "startup-app" }
      const connection = yield* PgConnection.make({ url: Redacted.make((yield* connectionUrl).toString()), ...config })
      yield* connection.query("SET statement_timeout = '5678ms'")
      yield* connection.query("SET search_path = public")
      yield* connection.query("SET application_name = 'changed-app'")
      const changed = yield* connection.query(settingsQuery)
      assert.deepStrictEqual(changed.rows, [{ timeout: "5678ms", path: "public", app: "changed-app" }])
      yield* connection.query("RESET ALL")
      const reset = yield* connection.query(settingsQuery)
      assert.deepStrictEqual(reset.rows, [{
        timeout: "1234ms",
        path: source === "named" ? "pg_catalog, public" : "pg_catalog,public",
        app: "startup-app"
      }])
    }))

  it.effect("explicit options override URL options on the server", () =>
    Effect.gen(function*() {
      const url = yield* connectionUrl
      url.searchParams.set("options", "-c statement_timeout=9999")
      const config = { url: Redacted.make(url.toString()), options: "-c statement_timeout=1234" }
      const connection = yield* PgConnection.make(config)
      assert.deepStrictEqual((yield* connection.query("SHOW statement_timeout")).rows, [{
        statement_timeout: "1234ms"
      }])
    }))

  it.effect.each([
    { multiplex: false, source: "config" },
    { multiplex: true, source: "config" },
    { multiplex: false, source: "URL" },
    { multiplex: true, source: "URL" }
  ])(
    "restores startup defaults after pool replacement (multiplex=$multiplex, options=$source)",
    ({ multiplex, source }) =>
      Effect.gen(function*() {
        const url = yield* connectionUrl
        if (source === "URL") url.searchParams.set("options", "-c lock_timeout=2345")
        const config = {
          url: Redacted.make(url.toString()),
          ...namedDefaults,
          options: source === "config" ? "-c lock_timeout=2345" : undefined,
          maxConnections: 1,
          multiplex
        }
        const pool = yield* PgPool.make(config)
        const first = yield* Effect.scoped(Effect.gen(function*() {
          const connection = yield* pool.get
          const settings = yield* connection.query(settingsQuery)
          const lock = yield* connection.query("SHOW lock_timeout")
          yield* connection.query("SET statement_timeout = '5678ms'")
          yield* pool.invalidate(connection)
          return { pid: connection.processId, settings: settings.rows, lock: lock.rows }
        }))
        const second = yield* Effect.scoped(Effect.gen(function*() {
          const connection = yield* pool.get
          const settings = yield* connection.query(settingsQuery)
          const lock = yield* connection.query("SHOW lock_timeout")
          yield* connection.query("SET statement_timeout = '5678ms'")
          yield* connection.query("SET lock_timeout = '6789ms'")
          yield* connection.query("RESET ALL")
          const reset = yield* connection.query(settingsQuery)
          const resetLock = yield* connection.query("SHOW lock_timeout")
          return {
            pid: connection.processId,
            settings: settings.rows,
            lock: lock.rows,
            reset: reset.rows,
            resetLock: resetLock.rows
          }
        }))
        assert.notStrictEqual(first.pid, second.pid)
        assert.deepStrictEqual(first.settings, expectedSettings)
        assert.deepStrictEqual(second.settings, expectedSettings)
        assert.deepStrictEqual(second.reset, expectedSettings)
        assert.deepStrictEqual(first.lock, [{ lock_timeout: "2345ms" }])
        assert.deepStrictEqual(second.lock, first.lock)
        assert.deepStrictEqual(second.resetLock, first.lock)
      })
  )

  it.effect.each(["pool", "single"])(
    "forwards startup configuration through PgClient (%s)",
    (kind) =>
      Effect.gen(function*() {
        const url = yield* connectionUrl
        url.searchParams.set("application_name", "url-app")
        url.searchParams.set("options", "-c lock_timeout=9999")
        const config = {
          url: Redacted.make(url.toString()),
          ...namedDefaults,
          options: "-c lock_timeout=2345",
          maxConnections: 1
        }
        const client = yield* kind === "pool" ? PgClient.make(config) : PgClient.makeClient(config)
        assert.deepStrictEqual(yield* client.unsafe(settingsQuery), expectedSettings)
        assert.deepStrictEqual(yield* client`SHOW lock_timeout`, [{ lock_timeout: "2345ms" }])
      }).pipe(Effect.provide(Reactivity.layer))
  )

  it.effect.each([
    { name: "unknown GUC", startupParameters: { effect_unknown_startup_guc: "value" }, code: "42704" },
    { name: "invalid GUC value", startupParameters: { statement_timeout: "not-a-duration" }, code: "22023" }
  ])("returns PostgreSQL's connect-time error for $name", ({ code, startupParameters }) =>
    Effect.gen(function*() {
      const config = { url: Redacted.make((yield* connectionUrl).toString()), startupParameters }
      const result = yield* Effect.result(PgConnection.make(config))
      assert.strictEqual(result._tag, "Failure", "PostgreSQL must reject the parameter during startup")
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "SqlError")
        assert.propertyVal(result.failure.reason.cause, "code", code)
      }
    }))
})
