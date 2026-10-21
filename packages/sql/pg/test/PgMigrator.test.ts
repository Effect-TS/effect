import { PgClient, PgMigrator } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Path, Redacted, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { Reactivity } from "effect/reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import { PassThrough } from "node:stream"

const makeMigrator = Effect.fnUntraced(function*(config: PgClient.PgClientConfig) {
  const commands: Array<ChildProcess.StandardCommand> = []
  const files: Array<string> = []
  const pg = yield* PgClient.make(config)
  const sql = yield* SqlClient.make({
    driver: "test",
    acquirer: Effect.succeed({
      execute: () => Effect.succeed([]),
      executeRaw: () => Effect.succeed([]),
      executeValues: () => Effect.succeed([]),
      executeUnprepared: () => Effect.succeed([]),
      executeValuesUnprepared: () => Effect.succeed([]),
      executeStream: () => Stream.empty
    }),
    compiler: PgClient.makeCompiler(),
    spanAttributes: []
  })
  const run = PgMigrator.run({
    loader: PgMigrator.fromRecord({ "1_init": Effect.void }),
    schemaDirectory: "migrations"
  }).pipe(
    Effect.provideService(PgClient.PgClient, pg),
    Effect.provideService(SqlClient.SqlClient, sql),
    Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, {
      ...ChildProcessSpawner.make(() => Effect.die("unexpected spawn")),
      string: (command) =>
        Effect.sync(() => {
          assert(ChildProcess.isStandardCommand(command))
          commands.push(command)
          return "SELECT 1;"
        })
    }),
    Effect.provide(FileSystem.layerNoop({
      makeDirectory: () => Effect.void,
      writeFileString: (path) =>
        Effect.sync(() => {
          files.push(path)
        })
    })),
    Effect.provide(Path.layer)
  )
  return { commands, files, run }
}, Effect.provide(Reactivity.layer))

// Parses the libpq conninfo passed as `pg_dump --dbname=<conninfo>`.
const dumpConnection = (command: ChildProcess.StandardCommand) => {
  const dbname = command.args.find((arg) => arg.startsWith("--dbname="))
  assert(dbname !== undefined, "pg_dump was not given --dbname")
  const conninfo: Record<string, string> = {}
  for (const [, key, quoted, plain] of dbname.slice(9).matchAll(/(\w+)\s*=\s*(?:'((?:[^'\\]|\\.)*)'|(\S*))/g)) {
    conninfo[key] = quoted !== undefined ? quoted.replace(/\\(.)/g, "$1") : plain
  }
  return conninfo
}

describe("PgMigrator", () => {
  it.effect("shares one password per schema dump and refreshes it for the next dump", () =>
    Effect.gen(function*() {
      let calls = 0
      const { commands, files, run } = yield* makeMigrator({
        password: Effect.map(Effect.yieldNow, () => Redacted.make(`secret-${++calls}`))
      })

      yield* run

      assert.strictEqual(calls, 1)
      assert.deepStrictEqual(commands.map((command) => command.command), ["pg_dump", "pg_dump"])
      assert.deepStrictEqual(commands.map((command) => command.options.env?.PGPASSWORD), ["secret-1", "secret-1"])

      yield* run

      assert.strictEqual(calls, 2)
      assert.deepStrictEqual(commands.map((command) => command.options.env?.PGPASSWORD), [
        "secret-1",
        "secret-1",
        "secret-2",
        "secret-2"
      ])
      assert.deepStrictEqual(files, ["migrations/_schema.sql", "migrations/_schema.sql"])
    }))

  it.effect("passes a static password to both dump processes", () =>
    Effect.gen(function*() {
      const { commands, files, run } = yield* makeMigrator({ password: Redacted.make("static") })
      yield* run

      assert.deepStrictEqual(commands.map((command) => command.options.env?.PGPASSWORD), ["static", "static"])
      assert.deepStrictEqual(files, ["migrations/_schema.sql"])
    }))
  it.effect("dumps through the connection resolved from the url and explicit fields", () =>
    Effect.gen(function*() {
      const { commands, run } = yield* makeMigrator({
        url: Redacted.make(
          "postgres://alice:s3cret@db.example.com:6543/app?sslmode=prefer&application_name=it%27s%20me&options=-c%20search_path%3Dapp"
        ),
        database: "reports"
      })
      yield* run

      assert.strictEqual(commands.length, 2)
      for (const command of commands) {
        const conninfo = dumpConnection(command)
        assert.containsSubset(conninfo, {
          host: "db.example.com",
          port: "6543",
          user: "alice",
          dbname: "reports",
          sslmode: "prefer",
          application_name: "it's me",
          options: "-c search_path=app"
        })
        assert.notProperty(conninfo, "password")
        assert.isFalse(command.args.some((arg) => arg.includes("s3cret")))
        assert.strictEqual(command.options.extendEnv, false)
        assert.deepStrictEqual(command.options.env, {
          PATH: (globalThis as any).process?.env.PATH,
          PGPASSWORD: "s3cret"
        })
      }
    }))

  it.effect("matches the client's socket and TLS settings", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<readonly [PgClient.PgClientConfig, Record<string, string>]> = [
        [{ path: "/var/run/postgresql/.s.PGSQL.5433" }, {
          host: "/var/run/postgresql",
          port: "5433",
          sslmode: "disable"
        }],
        [{ host: "db.example.com" }, { host: "db.example.com", sslmode: "disable" }],
        [{ host: "db.example.com", ssl: true }, { host: "db.example.com", sslmode: "verify-full" }],
        [{ host: "db.example.com", ssl: { rejectUnauthorized: false } }, { host: "db.example.com", sslmode: "require" }]
      ]
      for (const [config, expected] of cases) {
        const { commands, run } = yield* makeMigrator({ ...config, username: "alice" })
        yield* run
        assert.strictEqual(commands.length, 2)
        for (const command of commands) {
          assert.containsSubset(dumpConnection(command), expected)
        }
      }
    }))

  it.effect("does not dump clients that connect through a custom stream", () =>
    Effect.gen(function*() {
      const { commands, files, run } = yield* makeMigrator({ stream: () => new PassThrough(), username: "alice" })
      yield* run

      assert.deepStrictEqual(commands.map((command) => command.command), [])
      assert.deepStrictEqual(files, [])
    }))
})
