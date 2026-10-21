import { makeOAuthProxyPersistence, type OAuthProxySqlTable, validateStorage } from "@effect/auth-persistence/Adapter"
import { ConfigurationError, Persistence } from "@effect/auth/OAuthProxy"
import { getTableColumns, is, type Table } from "drizzle-orm"
import { getTableConfig as pgConfig, PgTable } from "drizzle-orm/pg-core"
import { getTableConfig as sqliteConfig, SQLiteTable } from "drizzle-orm/sqlite-core"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as SqlClient from "effect/sql/SqlClient"

/** Override logical column keys when using an application-owned table. */
export type OAuthProxyColumns<T extends Table> = Partial<
  {
    readonly [K in keyof OAuthProxySqlTable["columns"]]: Extract<keyof T["_"]["columns"], string>
  }
>

/**
 * The shared SQL kernel writes plain text and integer milliseconds directly;
 * Drizzle value codecs and write hooks do not run for these storage columns.
 *
 * @internal
 */
export const oauthProxyLayer = <T extends Table>(
  dialect: "sqlite" | "pg",
  table: T,
  columns: OAuthProxyColumns<T> = {}
) =>
  Layer.effect(
    Persistence,
    Effect.gen(function*() {
      const client = (yield* SqlClient.SqlClient).withoutTransforms()

      if (
        client.onDialectOrElse({
          sqlite: () => "sqlite",
          pg: () => "pg",
          orElse: () => "other"
        }) !== dialect
      ) {
        return yield* ConfigurationError.make({})
      }

      const mapping: OAuthProxySqlTable = yield* Effect.try({
        try: () =>
          Result.gen(function*() {
            const config = dialect === "pg" && is(table, PgTable)
              ? pgConfig(table)
              : dialect === "sqlite" && is(table, SQLiteTable)
              ? sqliteConfig(table)
              : undefined

            if (config === undefined) return yield* Result.fail(ConfigurationError.make({}))
            const declared = getTableColumns(table)

            const column = (key: keyof OAuthProxySqlTable["columns"]) =>
              Result.gen(function*() {
                const field = declared[columns[key] ?? key]
                const integer = key === "expiresAtMillis" || key === "handoffExpiresAtMillis"

                if (
                  field === undefined ||
                  !(integer
                    ? ["integer", "bigint"].includes(field.getSQLType())
                    : field.getSQLType() === "text") ||
                  field.notNull !== (key !== "handoffExpiresAtMillis")
                ) {
                  return yield* Result.fail(ConfigurationError.make({}))
                }

                return field.name
              })

            return {
              name: config.name,
              ...("schema" in config && config.schema !== undefined
                ? { schema: config.schema }
                : {}),
              columns: {
                namespace: yield* column("namespace"),
                flowId: yield* column("flowId"),
                version: yield* column("version"),
                stage: yield* column("stage"),
                context: yield* column("context"),
                expiresAtMillis: yield* column("expiresAtMillis"),
                handoffExpiresAtMillis: yield* column("handoffExpiresAtMillis"),
                payload: yield* column("payload")
              }
            }
          }),
        catch: () => ConfigurationError.make({})
      }).pipe(Effect.flatMap(Effect.fromResult))

      yield* validateStorage(
        dialect,
        {
          ...mapping,
          columns: Object.fromEntries(
            Object.entries(mapping.columns).map(([key, name]) => [key, { name }])
          )
        },
        [["namespace", "flowId"]]
      ).pipe(
        Effect.provideService(SqlClient.SqlClient, client),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ConfigurationError.make({}))))
      )

      return yield* makeOAuthProxyPersistence(mapping)
    })
  )
