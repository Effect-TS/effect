import { PgClient, PgMigrator } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, FileSystem, Logger, Path, Redacted, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Reactivity } from "effect/unstable/reactivity"
import * as SqlClient from "effect/unstable/sql/SqlClient"

const makeMigrator = (password: PgClient.PgClientConfig["password"]) =>
  Effect.gen(function*() {
    const commands: Array<ChildProcess.StandardCommand> = []
    const files: Array<string> = []
    const failures: Array<unknown> = []
    const pg = yield* PgClient.make({ password })
    const sql = yield* SqlClient.make({
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
      Effect.provide(Path.layer),
      Effect.provide(Logger.layer([Logger.make(({ cause }) => {
        if (cause.reasons.length > 0) {
          failures.push(Cause.squash(cause))
        }
      })]))
    )
    return { commands, failures, files, run }
  }).pipe(Effect.provide(Reactivity.layer))

describe("PgMigrator", () => {
  it.effect("shares one password per schema dump and refreshes it for the next dump", () =>
    Effect.gen(function*() {
      let calls = 0
      const { commands, failures, files, run } = yield* makeMigrator(
        Effect.map(Effect.yieldNow, () => Redacted.make(`secret-${++calls}`))
      )

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
      assert.deepStrictEqual(failures, [])
    }))

  it.effect("passes a static password to both dump processes", () =>
    Effect.gen(function*() {
      const { commands, failures, files, run } = yield* makeMigrator(Redacted.make("static"))
      yield* run

      assert.deepStrictEqual(commands.map((command) => command.options.env?.PGPASSWORD), ["static", "static"])
      assert.deepStrictEqual(files, ["migrations/_schema.sql"])
      assert.deepStrictEqual(failures, [])
    }))

  it.effect("logs password provider failures without running pg_dump or writing a schema", () =>
    Effect.gen(function*() {
      const cause = new Error("token fetch failed")
      const { commands, failures, files, run } = yield* makeMigrator(Effect.fail(cause))
      const completed = yield* run

      assert.deepStrictEqual(completed, [[1, "init"]])
      assert.deepStrictEqual(commands, [])
      assert.deepStrictEqual(files, [])
      assert.strictEqual(failures.length, 1)
      const error = failures[0]
      assert(error instanceof PgMigrator.MigrationError)
      assert.strictEqual(error.kind, "Failed")
      assert.strictEqual(error.message, "Failed to resolve PostgreSQL password")
      let original: unknown = error
      while (original instanceof Error && original.cause !== undefined) {
        original = original.cause
      }
      assert.strictEqual(original, cause)
    }))
})
