import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, PlatformError, Stream } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Migrator from "effect/sql/Migrator"
import * as SqlClient from "effect/sql/SqlClient"
import type { Connection } from "effect/sql/SqlConnection"
import * as Statement from "effect/sql/Statement"

const migrationNames = (
  migrations: ReadonlyArray<Migrator.ResolvedMigration>
): ReadonlyArray<readonly [id: number, name: string]> => migrations.map(([id, name]) => [id, name] as const)

// runs a single `fromSql` script against a client that records each statement
const runSqlScript = (dialect: Statement.Dialect, script: string) =>
  Effect.gen(function*() {
    const ran: Array<string> = []
    const execute = (sql: string) =>
      Effect.sync(() => {
        ran.push(sql)
        return []
      })
    const connection: Connection = {
      execute,
      executeRaw: execute,
      executeValues: execute,
      executeUnprepared: execute,
      executeValuesUnprepared: execute,
      executeStream: (sql) => Stream.fromEffect(execute(sql))
    }
    const sql = yield* SqlClient.make({
      driver: "test",
      acquirer: Effect.succeed(connection),
      compiler: Statement.makeCompiler({
        dialect,
        placeholder: () => "?",
        onIdentifier: Statement.defaultEscape("\""),
        onRecordUpdate: () => ["", []],
        onCustom: () => ["", []]
      }),
      spanAttributes: []
    })
    const migrations = yield* Migrator.fromSql({ "1_script.sql": script })
    const migration = yield* (migrations[0]![2] as Effect.Effect<Effect.Effect<void, unknown, SqlClient.SqlClient>>)
    yield* Effect.provideService(migration, SqlClient.SqlClient, sql)
    return ran
  }).pipe(Effect.provide(Reactivity.layer))

describe("Migrator", () => {
  describe("loaders", () => {
    it.effect("fromGlob accepts js, ts, mjs, and mts files", () =>
      Effect.gen(function*() {
        const migrations = yield* Migrator.fromGlob({
          "./migrations/0004_fourth.mts": () => Promise.resolve(Effect.void),
          "./migrations/0002_second.ts": () => Promise.resolve(Effect.void),
          "./migrations/0003_third.mjs": () => Promise.resolve(Effect.void),
          "./migrations/0001_first.js": () => Promise.resolve(Effect.void),
          "./migrations/0005_ignored.cjs": () => Promise.resolve(Effect.void)
        })

        assert.deepStrictEqual(migrationNames(migrations), [
          [1, "first"],
          [2, "second"],
          [3, "third"],
          [4, "fourth"]
        ])
      }))

    it.effect("fromBabelGlob accepts Js, Ts, Mjs, and Mts suffixes", () =>
      Effect.gen(function*() {
        const migrations = yield* Migrator.fromBabelGlob({
          _0004_fourthMts: Effect.void,
          _0002_secondTs: Effect.void,
          _0003_thirdMjs: Effect.void,
          _0001_firstJs: Effect.void
        })

        assert.deepStrictEqual(migrationNames(migrations), [
          [1, "first"],
          [2, "second"],
          [3, "third"],
          [4, "fourth"]
        ])
      }))

    it.effect("fromSql accepts numbered scripts with or without a directory and extension", () =>
      Effect.gen(function*() {
        const migrations = yield* Migrator.fromSql({
          "./migrations/0003_third.sql": "select 3",
          "0002_second": "select 2",
          "1_first.sql": "select 1",
          "./migrations/notes.txt": "select 4"
        })

        assert.deepStrictEqual(migrationNames(migrations), [
          [1, "first"],
          [2, "second"],
          [3, "third"]
        ])
      }))

    it.effect.each(
      [
        [
          "sqlite",
          "-- drop table old;\ncreate table t (id int);\n/* ; */ insert into t values ('a;b', 'it''s', \"c;d\");\n" +
          "select/**/1;\ncreate table price$usd$ (id int);\n-- done;\n",
          [
            "-- drop table old;\ncreate table t (id int)",
            "/* ; */ insert into t values ('a;b', 'it''s', \"c;d\")",
            "select/**/1",
            "create table price$usd$ (id int)"
          ]
        ],
        [
          "pg",
          "select E'a\\';b'; select 'c\\'; select $1;\n" +
          "create function f() returns int as $$ select 1; $$ language sql;\n" +
          "create function g() returns int as $body$ select 2; $body$ language sql;\n" +
          "/* outer /* inner; */ -- */ create table t (id int);\n" +
          "-- header\rcreate table u (id int);\nselect $é$a;b$é$;",
          [
            "select E'a\\';b'",
            "select 'c\\'",
            "select $1",
            "create function f() returns int as $$ select 1; $$ language sql",
            "create function g() returns int as $body$ select 2; $body$ language sql",
            "/* outer /* inner; */ -- */ create table t (id int)",
            "-- header\rcreate table u (id int)",
            "select $é$a;b$é$"
          ]
        ],
        [
          "mssql",
          "/* outer /* inner; */ -- */ create table t (id int);",
          ["/* outer /* inner; */ -- */ create table t (id int)"]
        ],
        [
          "clickhouse",
          "/* outer /* inner; */ -- */ select 1;\n// skipped;\nselect 2;\n# skipped;\n#!shebang;\nselect 3 #x; select 4;\n" +
          "select 5 as `a\\`;b`",
          [
            "/* outer /* inner; */ -- */ select 1",
            "// skipped;\nselect 2",
            "# skipped;\n#!shebang;\nselect 3 #x",
            "select 4",
            "select 5 as `a\\`;b`"
          ]
        ],
        [
          "mysql",
          "/*! CREATE TABLE t (id INT) */;\ninsert into t values ('it\\'s; fine', \"a\\\";b\");\nselect `x;y`;\n" +
          "select 1--1;\n# skipped;\nselect 2; -- done;",
          [
            "/*! CREATE TABLE t (id INT) */",
            "insert into t values ('it\\'s; fine', \"a\\\";b\")",
            "select `x;y`",
            "select 1--1",
            "# skipped;\nselect 2"
          ]
        ]
      ] as const
    )("fromSql runs each top-level %s statement verbatim", ([dialect, script, expected]) =>
      Effect.gen(function*() {
        const ran: ReadonlyArray<string> = yield* runSqlScript(dialect, script)
        assert.deepStrictEqual(ran, expected)
      }))

    it.effect("fromFileSystem accepts js, ts, mjs, and mts files", () =>
      Effect.gen(function*() {
        const migrations = yield* Migrator.fromFileSystem("/migrations").pipe(
          Effect.provide(FileSystem.layerNoop({
            readDirectory: () =>
              Effect.succeed([
                "0004_fourth.mts",
                "0002_second.ts",
                "0003_third.mjs",
                "0001_first.js",
                "0005_ignored.cjs"
              ])
          })),
          Effect.provide(Path.layer)
        )

        assert.deepStrictEqual(migrationNames(migrations), [
          [1, "first"],
          [2, "second"],
          [3, "third"],
          [4, "fourth"]
        ])
      }))

    it.effect("fromFileSystem imports migrations through the file URL the platform resolves", () =>
      Effect.gen(function*() {
        const posix = yield* Effect.provide(Path.Path, Path.layer)
        const migrationUrl = new URL("./fixtures/migrator/0001_first.js", import.meta.url)
        let resolvedPath: string | undefined
        // stand in for a Windows platform layer, which core has no implementation of
        const windowsLike = Layer.succeed(Path.Path)({
          ...posix,
          join: (...segments: ReadonlyArray<string>) => segments.join("\\"),
          toFileUrl: (path: string) => {
            resolvedPath = path
            return Effect.succeed(migrationUrl)
          }
        })

        const migrations = yield* Migrator.fromFileSystem("C:\\migrations").pipe(
          Effect.provide(FileSystem.layerNoop({
            readDirectory: () => Effect.succeed(["0001_first.js"])
          })),
          Effect.provide(windowsLike)
        )

        // the loader is lazy, and `ResolvedMigration` declares a `SqlClient`
        // requirement this loader never uses
        const load = migrations[0]![2] as Effect.Effect<unknown, unknown>
        const imported = yield* load

        assert.strictEqual(resolvedPath, "C:\\migrations\\0001_first.js")
        assert.strictEqual((imported as { readonly marker: string }).marker, "loaded")
      }))

    it.effect("fromFileSystem surfaces file URL failures as import errors", () =>
      Effect.gen(function*() {
        const posix = yield* Effect.provide(Path.Path, Path.layer)
        const failingPath = Layer.succeed(Path.Path)({
          ...posix,
          toFileUrl: () => Effect.fail(new PlatformError.BadArgument({ module: "Path", method: "toFileUrl" }))
        })

        const migrations = yield* Migrator.fromFileSystem("/migrations").pipe(
          Effect.provide(FileSystem.layerNoop({
            readDirectory: () => Effect.succeed(["0001_first.js"])
          })),
          Effect.provide(failingPath)
        )

        const load = migrations[0]![2] as Effect.Effect<unknown, unknown>
        const outcome = yield* load.pipe(
          Effect.catchDefect((defect) => Effect.succeed(`defect: ${defect}`)),
          Effect.orElseSucceed(() => "no defect")
        )

        // a typed failure here would escape `make`'s MigrationError | SqlError channel
        assert.include(outcome, "defect:")
      }))
  })
})
