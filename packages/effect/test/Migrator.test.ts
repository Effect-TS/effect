import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, PlatformError } from "effect"
import * as Migrator from "effect/sql/Migrator"
import * as SqlClient from "effect/sql/SqlClient"

const migrationNames = (
  migrations: ReadonlyArray<Migrator.ResolvedMigration>
): ReadonlyArray<readonly [id: number, name: string]> => migrations.map(([id, name]) => [id, name] as const)

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

    it.effect("fromSql runs numbered scripts one statement at a time", () =>
      Effect.gen(function*() {
        const ran: Array<string> = []
        const sql = {
          unsafe: (statement: string) =>
            Effect.sync(() => {
              ran.push(statement)
            })
        } as any as SqlClient.SqlClient
        const migrations = yield* Migrator.fromSql({
          "0002_second.sql": "insert into t values ('a;b');",
          "1_init.sql": "-- drop table old;\ncreate table t (id int);\n/* ;\n*/\ncreate index t_id on t (id);",
          "3_fn.sql":
            "select/**/1; select $1; create function f() returns void as $$ begin perform 1; end $$ language sql; create function g() returns void as $body$ begin perform 1; end $body$ language sql;",
          "notes.txt": "select 1"
        })

        assert.deepStrictEqual(migrationNames(migrations), [
          [1, "init"],
          [2, "second"],
          [3, "fn"]
        ])

        const first = yield* migrations[0]![2] as Effect.Effect<Effect.Effect<void>>
        const second = yield* migrations[1]![2] as Effect.Effect<Effect.Effect<void>>
        const third = yield* migrations[2]![2] as Effect.Effect<Effect.Effect<void>>
        yield* first.pipe(Effect.provideService(SqlClient.SqlClient, sql))
        yield* second.pipe(Effect.provideService(SqlClient.SqlClient, sql))
        yield* third.pipe(Effect.provideService(SqlClient.SqlClient, sql))
        assert.deepStrictEqual(ran, [
          "create table t (id int)",
          "create index t_id on t (id)",
          "insert into t values ('a;b')",
          "select 1",
          "select $1",
          "create function f() returns void as $$ begin perform 1; end $$ language sql",
          "create function g() returns void as $body$ begin perform 1; end $body$ language sql"
        ])
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
