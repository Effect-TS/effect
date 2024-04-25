/**
 * @since 1.0.0
 */
import { FileSystem } from "@effect/platform/FileSystem"
import * as Arr from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import type { Client } from "./Client.js"
import type { SqlError } from "./Error.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface MigratorOptions<R = never> {
  readonly loader: Loader<R>
  readonly schemaDirectory?: string
  readonly table?: string
}

/**
 * @category model
 * @since 1.0.0
 */
export type Loader<R = never> = Effect.Effect<
  ReadonlyArray<ResolvedMigration>,
  MigrationError,
  R
>

/**
 * @category model
 * @since 1.0.0
 */
export type ResolvedMigration = readonly [
  id: number,
  name: string,
  load: Effect.Effect<any>
]

/**
 * @category model
 * @since 1.0.0
 */
export interface Migration {
  readonly id: number
  readonly name: string
  readonly createdAt: Date
}

/**
 * @category errors
 * @since 1.0.0
 */
export class MigrationError extends Data.TaggedError("MigrationError")<{
  readonly _tag: "MigrationError"
  readonly reason:
    | "bad-state"
    | "import-error"
    | "failed"
    | "duplicates"
    | "locked"
  readonly message: string
}> {
  [Symbol.iterator]() {
    return this as any // TOOD: fix
  }
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = <R extends Client, RD, RE, RL, R2 = never>({
  dumpSchema = () => Effect.void,
  ensureTable,
  getClient,
  lockTable = () => Effect.void
}: {
  getClient: Effect.Effect<R, SqlError, R>
  ensureTable: (sql: R, table: string) => Effect.Effect<unknown, SqlError, RE>
  dumpSchema?: (
    sql: R,
    path: string,
    migrationsTable: string
  ) => Effect.Effect<unknown, MigrationError, RD>
  lockTable?: (sql: R, table: string) => Effect.Effect<unknown, SqlError, RL>
}) =>
({
  loader,
  schemaDirectory,
  table = "effect_sql_migrations"
}: MigratorOptions<R2>): Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  MigrationError | SqlError,
  R | RD | RE | RL | R2
> =>
  Effect.gen(function*(_) {
    const sql = yield* _(getClient)
    const ensureMigrationsTable = ensureTable(sql, table)

    const insertMigrations = (
      rows: ReadonlyArray<[id: number, name: string]>
    ) =>
      sql`INSERT INTO ${sql(table)} ${
        sql.insert(
          rows.map(([migration_id, name]) => ({ migration_id, name }))
        )
      }`.withoutTransform

    const latestMigration = Effect.map(
      sql<{ migration_id: number; name: string; created_at: Date }>`SELECT migration_id, name, created_at FROM ${
        sql(table)
      } ORDER BY migration_id DESC`.withoutTransform,
      (_) =>
        Option.map(
          Option.fromNullable(_[0] as any),
          ({ created_at, migration_id, name }): Migration => ({
            id: migration_id,
            name,
            createdAt: created_at
          })
        )
    )

    const loadMigration = ([id, name, load]: ResolvedMigration) =>
      Effect.catchAllDefect(load, (_) =>
        Effect.fail(
          new MigrationError({
            reason: "import-error",
            message: `Could not import migration "${id}_${name}"\n\n${_}`
          })
        )).pipe(
          Effect.flatMap((_) =>
            Effect.isEffect(_)
              ? Effect.succeed(_)
              : _.default
              ? Effect.succeed(_.default?.default ?? _.default)
              : Effect.fail(
                new MigrationError({
                  reason: "import-error",
                  message: `Default export not found for migration "${id}_${name}"`
                })
              )
          ),
          Effect.filterOrFail(
            (_): _ is Effect.Effect<unknown> => Effect.isEffect(_),
            () =>
              new MigrationError({
                reason: "import-error",
                message: `Default export was not an Effect for migration "${id}_${name}"`
              })
          )
        )

    const runMigration = (
      id: number,
      name: string,
      effect: Effect.Effect<unknown>
    ) =>
      Effect.orDieWith(effect, (_) =>
        new MigrationError({
          reason: "failed",
          message: `Migration "${id}_${name}" failed: ${JSON.stringify(_)}`
        }))

    // === run

    const run = Effect.gen(function*(_) {
      yield* _(lockTable(sql, table))

      const [latestMigrationId, current] = yield* _(
        Effect.all([
          Effect.map(
            latestMigration,
            Option.match({
              onNone: () => 0,
              onSome: (_) => _.id
            })
          ),
          loader
        ])
      )

      if (new Set(current.map(([id]) => id)).size !== current.length) {
        yield* _(
          new MigrationError({
            reason: "duplicates",
            message: "Found duplicate migration id's"
          })
        )
      }

      const required: Array<ResolvedMigration> = []

      for (const resolved of current) {
        const [currentId, currentName] = resolved
        if (currentId <= latestMigrationId) {
          continue
        }

        required.push([
          currentId,
          currentName,
          yield* _(loadMigration(resolved))
        ])
      }

      if (required.length > 0) {
        yield* _(
          insertMigrations(required.map(([id, name]) => [id, name])),
          Effect.mapError((_) =>
            new MigrationError({
              reason: "locked",
              message: "Migrations already running"
            })
          )
        )
      }

      yield* _(
        Effect.forEach(
          required,
          ([id, name, effect]) =>
            Effect.logDebug(`Running migration`).pipe(
              Effect.zipRight(runMigration(id, name, effect)),
              Effect.annotateLogs("migration_id", String(id)),
              Effect.annotateLogs("migration_name", name)
            ),
          { discard: true }
        )
      )

      yield* _(
        latestMigration,
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.logDebug(`Migrations complete`),
            onSome: (_) =>
              Effect.logDebug(`Migrations complete`).pipe(
                Effect.annotateLogs("latest_migration_id", _.id.toString()),
                Effect.annotateLogs("latest_migration_name", _.name)
              )
          })
        )
      )

      return required.map(([id, name]) => [id, name] as const)
    })

    yield* _(ensureMigrationsTable)

    const completed = yield* _(
      sql.withTransaction(run),
      Effect.catchTag("MigrationError", (_) =>
        _.reason === "locked"
          ? Effect.as(Effect.logDebug(_.message), [])
          : Effect.fail(_))
    )

    if (schemaDirectory && completed.length > 0) {
      yield* _(
        dumpSchema(sql, `${schemaDirectory}/_schema.sql`, table),
        Effect.catchAllCause((cause) => Effect.logInfo("Could not dump schema", cause))
      )
    }

    return completed
  })

const migrationOrder = Order.make<ResolvedMigration>(([a], [b]) => Order.number(a, b))

/**
 * @since 1.0.0
 * @category loaders
 */
export const fromGlob = (
  migrations: Record<string, () => Promise<any>>
): Loader =>
  pipe(
    Object.keys(migrations),
    Arr.filterMap((_) => Option.fromNullable(_.match(/^(?:.*\/)?(\d+)_([^.]+)\.(js|ts)$/))),
    Arr.map(
      ([key, id, name]): ResolvedMigration => [
        Number(id),
        name,
        Effect.promise(() => migrations[key]())
      ]
    ),
    Arr.sort(migrationOrder),
    Effect.succeed
  )

/**
 * @since 1.0.0
 * @category loaders
 */
export const fromBabelGlob = (migrations: Record<string, any>): Loader =>
  pipe(
    Object.keys(migrations),
    Arr.filterMap((_) => Option.fromNullable(_.match(/^_(\d+)_([^.]+?)(Js|Ts)?$/))),
    Arr.map(
      ([key, id, name]): ResolvedMigration => [
        Number(id),
        name,
        Effect.succeed(migrations[key])
      ]
    ),
    Arr.sort(migrationOrder),
    Effect.succeed
  )

/**
 * @since 1.0.0
 * @category loaders
 */
export const fromFileSystem = (directory: string): Loader<FileSystem> =>
  FileSystem.pipe(
    Effect.flatMap((FS) => FS.readDirectory(directory)),
    Effect.mapError((error) => new MigrationError({ reason: "failed", message: error.message })),
    Effect.map((files): ReadonlyArray<ResolvedMigration> =>
      files
        .map((file) => Option.fromNullable(file.match(/^(?:.*\/)?(\d+)_([^.]+)\.(js|ts)$/)))
        .flatMap(
          Option.match({
            onNone: () => [],
            onSome: ([basename, id, name]): ReadonlyArray<ResolvedMigration> =>
              [
                [
                  Number(id),
                  name,
                  Effect.promise(
                    () =>
                      import(
                        /* @vite-ignore */
                        `${directory}/${basename}`
                      )
                  )
                ]
              ] as const
          })
        )
        .sort(([a], [b]) => a - b)
    )
  )
