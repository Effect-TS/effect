import { PgClient, PgMigrator } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, FileSystem, Logger, Path, Redacted, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Reactivity } from "effect/unstable/reactivity"
import * as SqlClient from "effect/unstable/sql/SqlClient"

const runMigrations = (password: PgClient.PgClientConfig["password"]) =>
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
    const completed = yield* PgMigrator.run({
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
    return { commands, completed, failures, files }
  }).pipe(Effect.provide(Reactivity.layer))

describe("PgMigrator", () => {
  it.effect("resolves a fresh password before each pg_dump invocation", () =>
    Effect.gen(function*() {
      let calls = 0
      const { commands, failures, files } = yield* runMigrations(
        Effect.map(Effect.yieldNow, () => Redacted.make(`secret-${++calls}`))
      )

      assert.strictEqual(calls, 2)
      assert.deepStrictEqual(commands.map((command) => command.command), ["pg_dump", "pg_dump"])
      assert.deepStrictEqual(commands.map((command) => command.options.env?.PGPASSWORD).sort(), [
        "secret-1",
        "secret-2"
      ])
      assert.deepStrictEqual(files, ["migrations/_schema.sql"])
      assert.deepStrictEqual(failures, [])
    }))

  it.effect("logs password provider failures without running pg_dump or writing a schema", () =>
    Effect.gen(function*() {
      const { commands, completed, failures, files } = yield* runMigrations(Effect.fail("token fetch failed"))

      assert.deepStrictEqual(completed, [[1, "init"]])
      assert.deepStrictEqual(commands, [])
      assert.deepStrictEqual(files, [])
      assert.strictEqual(failures.length, 1)
      const error = failures[0]
      assert(error instanceof PgMigrator.MigrationError)
      assert.strictEqual(error.kind, "Failed")
      assert.strictEqual(error.message, "Failed to resolve PostgreSQL password")
    }))
})
