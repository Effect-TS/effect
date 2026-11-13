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
 * Import it from `@effect/sql-clickhouse/ClickhouseWebClient`: the package
 * root also exports `ClickhouseClient`, which needs Node built-ins.
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as ClickhouseWeb from "@clickhouse/client-web"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Reactivity from "effect/reactivity/Reactivity"
import type * as Scope from "effect/Scope"
import type * as Client from "effect/sql/SqlClient"
import { type SqlError } from "effect/sql/SqlError"
import type * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"
import * as Core from "./internal/core.ts"

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
  Core.make(
    TypeId,
    options,
    ClickhouseWeb.createClient,
    (evaluate, onError) => Stream.fromReadableStream({ evaluate: evaluate as () => ReadableStream, onError })
  ) as Effect.Effect<ClickhouseWebClient & Client.SqlClient, SqlError, Scope.Scope | Reactivity.Reactivity>

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
  Core.layer(ClickhouseWebClient, Effect.flatMap(Config.unwrap(config), make))

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
  Core.layer(ClickhouseWebClient, make(config))

/**
 * Fiber reference read by the low-level ClickHouse connection to choose query
 * or command execution for statements; defaults to `query`. Shared with
 * `ClickhouseClient.ClientMethod`.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export const ClientMethod: Context.Reference<"query" | "command" | "insert"> = Core.ClientMethod

/**
 * Fiber reference for the ClickHouse `query_id` applied to queries and
 * inserts; a random UUID is generated when no query ID is set. Shared with
 * `ClickhouseClient.QueryId`.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export const QueryId: Context.Reference<string | undefined> = Core.QueryId

/**
 * Fiber reference containing ClickHouse settings to attach to queries,
 * commands, and inserts. Shared with `ClickhouseClient.ClickhouseSettings`.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export const ClickhouseSettings: Context.Reference<
  NonNullable<ClickhouseWeb.BaseQueryParams["clickhouse_settings"]>
> = Core.ClickhouseSettings as Context.Reference<NonNullable<ClickhouseWeb.BaseQueryParams["clickhouse_settings"]>>

/**
 * Creates the SQL statement compiler for ClickHouse, emitting typed
 * `{pN: Type}` placeholders and escaping identifiers with an optional query
 * name transform.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const makeCompiler: (transform?: (_: string) => string) => Statement.Compiler = Core.makeCompiler

/**
 * Custom SQL fragment type used for ClickHouse typed parameters created by
 * `ClickhouseWebClient.param`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export type ClickhouseCustom = Core.ClickhouseCustom
