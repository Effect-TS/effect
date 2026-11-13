/**
 * ClickHouse driver for Effect SQL on fetch-only runtimes, backed by
 * `@clickhouse/client-web`.
 *
 * This module is the counterpart of `ClickhouseClient` for runtimes without
 * Node built-ins, such as Cloudflare Workers, Deno Deploy and browsers. It
 * talks to ClickHouse over `fetch` and reads results through web streams, and
 * its import graph contains neither `@clickhouse/client` nor any `node:`
 * module. `make` creates a scoped client, checks the connection, maps
 * ClickHouse errors to `SqlError`, and aborts plus kills in-flight queries when
 * interrupted, exactly as the Node client does. `ClickhouseMigrator` works with
 * both clients.
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as ClickhouseWeb from "@clickhouse/client-web"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Reactivity from "effect/reactivity/Reactivity"
import type * as Scope from "effect/Scope"
import * as Client from "effect/sql/SqlClient"
import { SqlError } from "effect/sql/SqlError"
import type * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"
import * as Core from "./internal/core.ts"

type WebSettings = NonNullable<ClickhouseWeb.BaseQueryParams["clickhouse_settings"]>

const ClickhouseSettings: Context.Reference<WebSettings> = Context.Reference(Core.ClickhouseSettingsKey, {
  defaultValue: () => ({})
})

/**
 * Unique runtime identifier used to tag `ClickhouseWebClient` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.5
 */
export const TypeId: TypeId = "~@effect/sql-clickhouse/ClickhouseWebClient"

/**
 * Type-level literal for the `ClickhouseWebClient` runtime identifier.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.5
 */
export type TypeId = "~@effect/sql-clickhouse/ClickhouseWebClient"

/**
 * ClickHouse-specific `SqlClient` extension for fetch-only runtimes, with
 * access to its configuration, the underlying `@clickhouse/client-web`
 * instance, typed parameter fragments, command-mode execution, insert
 * queries, and per-effect query ID and ClickHouse settings.
 *
 * **Gotchas**
 *
 * - Insert values must be arrays or JSON documents; streaming inserts are not
 *   supported by `@clickhouse/client-web`.
 * - Connectivity is checked with a `SELECT` rather than the `/ping` endpoint,
 *   so credentials are verified on connect.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export interface ClickhouseWebClient extends Client.Base {
  readonly [TypeId]: TypeId
  readonly config: ClickhouseWebClientConfig
  /**
   * The `@clickhouse/client-web` instance behind this client, for driver
   * features the SQL client does not wrap, such as `exec()` with raw output
   * formats. Requests made on it bypass `withQueryId`,
   * `withClickhouseSettings` and interruption handling; pass `query_id`,
   * `clickhouse_settings` and `abort_signal` directly. It sends requests through
   * the `fetch` from the configuration and is closed with the client's scope.
   */
  readonly client: ClickhouseWeb.ClickHouseClient
  readonly param: (dataType: string, value: unknown) => Statement.Fragment
  readonly asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly insertQuery: <T = unknown>(options: {
    readonly table: string
    readonly values: ReadonlyArray<T> | ClickhouseWeb.InputJSON<T> | ClickhouseWeb.InputJSONObjectEachRow<T>
    readonly format?: ClickhouseWeb.DataFormat
    readonly columns?: NonNullable<ClickhouseWeb.InsertParams<ReadableStream, T>["columns"]>
  }) => Effect.Effect<ClickhouseWeb.InsertResult, SqlError>
  readonly withQueryId: {
    (queryId: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string): Effect.Effect<A, E, R>
  }
  readonly withClickhouseSettings: {
    (
      settings: NonNullable<ClickhouseWeb.BaseQueryParams["clickhouse_settings"]>
    ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(
      effect: Effect.Effect<A, E, R>,
      settings: NonNullable<ClickhouseWeb.BaseQueryParams["clickhouse_settings"]>
    ): Effect.Effect<A, E, R>
  }
}

/**
 * Service tag for the active fetch-based ClickHouse SQL client.
 *
 * **When to use**
 *
 * Use to access or provide a ClickHouse SQL client built on
 * `@clickhouse/client-web` through the Effect context.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export const ClickhouseWebClient = Context.Service<ClickhouseWebClient, ClickhouseWebClient & Client.SqlClient>(
  "@effect/sql-clickhouse/ClickhouseWebClient"
)

/**
 * Configuration for creating a fetch-based ClickHouse client, combining
 * `@clickhouse/client-web` options, including a custom `fetch`, with optional
 * span attributes and query/result name transforms.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface ClickhouseWebClientConfig extends ClickhouseWeb.ClickHouseClientConfigOptions {
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * Creates a scoped `ClickhouseWebClient`, verifies connectivity, closes the
 * underlying client when the scope ends, maps ClickHouse failures to
 * `SqlError`, and aborts plus kills in-flight queries when interrupted.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const make = (
  options: ClickhouseWebClientConfig
): Effect.Effect<ClickhouseWebClient & Client.SqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.map(Core.make(options, makeBackend), ({ backend, sql }) => {
    const { client } = backend
    return Object.assign(sql, {
      [TypeId]: TypeId as TypeId,
      config: options,
      client,
      param: Core.param,
      asCommand<A, E, R>(effect: Effect.Effect<A, E, R>) {
        return Effect.provideService(effect, Core.ClientMethod, "command")
      },
      insertQuery<T = unknown>(options: {
        readonly table: string
        readonly values: ReadonlyArray<T> | ClickhouseWeb.InputJSON<T> | ClickhouseWeb.InputJSONObjectEachRow<T>
        readonly format?: ClickhouseWeb.DataFormat
        readonly columns?: NonNullable<ClickhouseWeb.InsertParams<ReadableStream, T>["columns"]>
      }) {
        return Core.runAbortable(
          backend,
          { message: "Failed to insert data", operation: "insert" },
          (base) => client.insert({ format: "JSONEachRow", ...options, ...base })
        )
      },
      withQueryId: dual(
        2,
        <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string) =>
          Effect.provideService(effect, Core.QueryId, queryId)
      ),
      withClickhouseSettings: dual(
        2,
        <A, E, R>(
          effect: Effect.Effect<A, E, R>,
          settings: NonNullable<ClickhouseWeb.BaseQueryParams["clickhouse_settings"]>
        ) => Effect.provideService(effect, ClickhouseSettings, settings)
      )
    })
  })

const makeBackend = (
  options: ClickhouseWebClientConfig
): Core.Backend<ClickhouseWeb.ClickHouseClient, ClickhouseWeb.ResultSet<unknown>, WebSettings> => {
  const client = ClickhouseWeb.createClient(options)
  return {
    client,
    settings: ClickhouseSettings,
    adapter: {
      ping: () => client.ping(),
      close: () => client.close(),
      query: (request) => client.query(request),
      command: (request) => client.command(request),
      stream: (result) =>
        Stream.fromReadableStream<ReadonlyArray<Core.Row>, SqlError>({
          // `ResultSet<unknown>` hides `stream()`, which is only valid for the
          // streamable formats the driver requests whenever it streams.
          evaluate: () => (result as ClickhouseWeb.ResultSet<"JSONEachRow">).stream(),
          onError: (cause) => new SqlError({ reason: Core.classifyError(cause, "Failed to execute stream", "stream") })
        })
    }
  }
}

/**
 * Provides both `ClickhouseWebClient` and generic `SqlClient` services from a
 * `Config`-backed fetch-based ClickHouse client configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layerConfig = (
  config: Config.Wrap<ClickhouseWebClientConfig>
): Layer.Layer<ClickhouseWebClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  Layer.effectContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(ClickhouseWebClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * Provides both `ClickhouseWebClient` and generic `SqlClient` services from a
 * fetch-based ClickHouse client configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = (
  config: ClickhouseWebClientConfig
): Layer.Layer<ClickhouseWebClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  Layer.effectContext(
    Effect.map(make(config), (client) =>
      Context.make(ClickhouseWebClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))
