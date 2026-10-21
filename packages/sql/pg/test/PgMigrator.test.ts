import { PgClient, PgMigrator } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, FileSystem, Path, Redacted, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { Reactivity } from "effect/reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import * as Fs from "node:fs"
import { syncBuiltinESMExports } from "node:module"
import * as NodePath from "node:path"
import { PassThrough } from "node:stream"
import Tls from "node:tls"

const makeMigrator = Effect.fnUntraced(function*(
  config: PgClient.PgClientConfig,
  onSpawn?: (command: ChildProcess.StandardCommand) => void
) {
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
          onSpawn?.(command)
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

const pem = (label: string, body: string) => `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`

// Simulates a Node.js runtime without tls.getCACertificates (before 22.15 / 23.10).
const withoutGetCACertificates = Effect.acquireRelease(
  Effect.sync(() => {
    const original = Tls.getCACertificates
    ;(Tls as any).getCACertificates = undefined
    syncBuiltinESMExports()
    return original
  }),
  (original) =>
    Effect.sync(() => {
      Tls.getCACertificates = original
      syncBuiltinESMExports()
    })
)

// Sequential: one test removes tls.getCACertificates process-wide
describe("PgMigrator", { concurrent: false }, () => {
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
          "postgres://alice:s3cret@db.example.com:6543/app?sslmode=prefer&connect_timeout=7&application_name=it%27s%20me&options=-c%20search_path%3Dapp"
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
          // The client verifies the certificate whenever the server accepts TLS
          sslmode: "verify-full",
          connect_timeout: "7",
          application_name: "it's me",
          options: "-c search_path=app"
        })
        assert.notProperty(conninfo, "password")
        assert.include(command.args, "--no-password")
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
      const cases: ReadonlyArray<readonly [PgClient.PgClientConfig, Record<string, string | undefined>]> = [
        [{ path: "/var/run/postgresql/.s.PGSQL.5433" }, {
          host: "/var/run/postgresql",
          port: "5433",
          sslmode: "disable"
        }],
        [{ host: "db.example.com" }, { host: "db.example.com", sslmode: "disable" }],
        [{ host: "db.example.com", ssl: true }, { host: "db.example.com", sslmode: "verify-full" }],
        [{ host: "db.example.com", ssl: { rejectUnauthorized: false } }, {
          host: "db.example.com",
          sslmode: "require"
        }],
        [{ url: Redacted.make("postgres://db.example.com/app?sslmode=allow") }, {
          host: "db.example.com",
          sslmode: "verify-full"
        }],
        [{ host: "db.example.com", connectTimeout: Duration.infinity }, { connect_timeout: undefined }]
      ]
      for (const [config, expected] of cases) {
        const { commands, run } = yield* makeMigrator({ ...config, username: "alice" })
        yield* run
        assert.strictEqual(commands.length, 2)
        for (const command of commands) {
          const conninfo = dumpConnection(command)
          for (const [key, value] of Object.entries(expected)) {
            assert.strictEqual(conninfo[key], value, key)
          }
        }
      }
    }))

  it.effect("does not dump connections that libpq cannot reproduce", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<PgClient.PgClientConfig> = [
        { stream: () => new PassThrough() },
        { host: "db.example.com", ssl: { minVersion: "TLSv1.3" } },
        { host: "db.example.com", ssl: { servername: "other.example.com" } },
        { host: "db.example.com", ssl: { cert: pem("CERTIFICATE", "Y2VydA==") } },
        { path: "/var/run/postgresql/.s.PGSQL.5432", ssl: true },
        { path: "/tmp/postgres.sock" }
      ]
      for (const config of cases) {
        const { commands, files, run } = yield* makeMigrator({ ...config, username: "alice" })
        yield* run

        assert.deepStrictEqual(commands.map((command) => command.command), [])
        assert.deepStrictEqual(files, [])
      }
    }))

  it.effect("requires an explicit ca when Node cannot report its default CAs", () =>
    Effect.gen(function*() {
      yield* withoutGetCACertificates

      const implicit = yield* makeMigrator({ host: "db.example.com", username: "alice", ssl: true })
      yield* implicit.run
      assert.deepStrictEqual(implicit.commands.map((command) => command.command), [])
      assert.deepStrictEqual(implicit.files, [])

      const explicit = yield* makeMigrator({
        host: "db.example.com",
        username: "alice",
        ssl: { ca: pem("CERTIFICATE", "Y2E=") }
      })
      yield* explicit.run
      assert.strictEqual(explicit.commands.length, 2)
      for (const command of explicit.commands) {
        assert.strictEqual(dumpConnection(command).sslmode, "verify-full")
      }
    }))

  it.effect("provides TLS files only while the dump runs", () =>
    Effect.gen(function*() {
      const ca = pem("CERTIFICATE", "Y2E=")
      const cert = pem("CERTIFICATE", "Y2VydA==")
      const key = pem("PRIVATE KEY", "a2V5")
      const cases: ReadonlyArray<{
        readonly ssl: PgClient.PgClientConfig["ssl"]
        readonly files: Record<"sslrootcert" | "sslcert" | "sslkey", string | undefined>
        readonly fail: boolean
      }> = [
        { ssl: { ca, cert, key }, files: { sslrootcert: ca, sslcert: cert, sslkey: key }, fail: false },
        {
          ssl: { rejectUnauthorized: false },
          files: { sslrootcert: undefined, sslcert: undefined, sslkey: undefined },
          fail: false
        },
        { ssl: { ca, cert, key }, files: { sslrootcert: ca, sslcert: cert, sslkey: key }, fail: true }
      ]
      for (const { fail, files, ssl } of cases) {
        const directories = new Set<string>()
        const { commands, run } = yield* makeMigrator({ host: "db.example.com", username: "alice", ssl }, (command) => {
          const conninfo = dumpConnection(command)
          for (const [name, contents] of Object.entries(files)) {
            const path = conninfo[name]
            directories.add(NodePath.dirname(path))
            if (contents === undefined) {
              assert.isFalse(Fs.existsSync(path), name)
            } else {
              assert.include(Fs.readFileSync(path, "utf8"), contents, name)
            }
          }
          if (files.sslkey !== undefined) {
            // libpq rejects private keys readable by group or others
            assert.strictEqual(Fs.statSync(conninfo.sslkey).mode & 0o777, 0o600)
          }
          if (fail) throw new Error("pg_dump failed")
        })
        yield* run

        assert.isAbove(commands.length, 0)
        assert.strictEqual(directories.size, 1)
        for (const directory of directories) {
          assert.isFalse(Fs.existsSync(directory), directory)
        }
      }
    }))
})
