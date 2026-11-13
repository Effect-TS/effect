/**
 * ClickHouse driver for Effect SQL, backed by `@clickhouse/client`.
 *
 * This module provides both the ClickHouse-specific {@link ClickhouseClient}
 * service and the generic {@link Client.SqlClient} service. `make` creates a
 * scoped client, checks the connection with `ping()`, maps ClickHouse errors
 * to `SqlError`, and aborts in-flight queries when interrupted. The
 * ClickHouse-specific service adds typed parameters, command execution, insert
 * queries, query id and settings helpers, a statement compiler, and direct or
 * config-backed layers.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Clickhouse from "@clickhouse/client"
import * as NodeStream from "@effect/platform-node/NodeStream"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Reactivity from "effect/reactivity/Reactivity"
import type * as Scope from "effect/Scope"
import type * as Client from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import type * as Statement from "effect/sql/Statement"
import type { Readable } from "node:stream"
import * as Core from "./internal/core.ts"

/**
 * Unique runtime identifier used to tag `ClickhouseClient` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-clickhouse/ClickhouseClient"

/**
 * Type-level literal for the `ClickhouseClient` runtime identifier.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-clickhouse/ClickhouseClient"

/**
 * ClickHouse-specific `SqlClient` extension with access to its configuration,
 * the underlying `@clickhouse/client` instance, typed parameter fragments,
 * command-mode execution, insert queries, and per-effect query ID and
 * ClickHouse settings.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface ClickhouseClient extends Client.Base {
  readonly [TypeId]: TypeId
  readonly config: ClickhouseClientConfig
  /**
   * The `@clickhouse/client` instance behind this client, for driver features
   * the SQL client does not wrap, such as `exec()` with raw output formats.
   * Requests made on it bypass `withQueryId`, `withClickhouseSettings` and
   * interruption handling; pass `query_id`, `clickhouse_settings` and
   * `abort_signal` directly. It is closed with the client's scope.
   */
  readonly client: Clickhouse.ClickHouseClient
  readonly param: (dataType: string, value: unknown) => Statement.Fragment
  readonly asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly insertQuery: <T = unknown>(options: {
    readonly table: string
    readonly values: Clickhouse.InsertValues<Readable, T>
    readonly format?: Clickhouse.DataFormat
    readonly columns?: NonNullable<Clickhouse.InsertParams<Readable, T>["columns"]>
  }) => Effect.Effect<Clickhouse.InsertResult, SqlError>
  readonly withQueryId: {
    (queryId: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string): Effect.Effect<A, E, R>
  }
  readonly withClickhouseSettings: {
    (
      settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
    ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(
      effect: Effect.Effect<A, E, R>,
      settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
    ): Effect.Effect<A, E, R>
  }
}

/**
 * Service tag for the active ClickHouse SQL client.
 *
 * **When to use**
 *
 * Use to access or provide a ClickHouse SQL client through the Effect context.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const ClickhouseClient = Context.Service<ClickhouseClient, ClickhouseClient & Client.SqlClient>(
  "@effect/sql-clickhouse/ClickhouseClient"
)

/**
 * Configuration for creating a ClickHouse client, combining
 * `@clickhouse/client` options with optional span attributes and query/result
 * name transforms.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ClickhouseClientConfig extends Clickhouse.ClickHouseClientConfigOptions {
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * Creates a scoped `ClickhouseClient`, verifies connectivity with `ping()`,
 * and closes the underlying driver when the scope ends.
 *
 * **Gotchas**
 *
 * Interruption aborts the request and attempts server-side cancellation.
 * `KILL QUERY` failures are ignored, and the kill request is aborted after
 * five seconds if it has not completed.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  options: ClickhouseClientConfig
): Effect.Effect<ClickhouseClient & Client.SqlClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Core.make(TypeId, options, Clickhouse.createClient, NodeStream.fromReadable) as Effect.Effect<
    ClickhouseClient & Client.SqlClient,
    SqlError,
    Scope.Scope | Reactivity.Reactivity
  >

/**
 * Fiber reference read by the low-level ClickHouse connection to choose query
 * or command execution for statements; defaults to `query`.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const ClientMethod: Context.Reference<"query" | "command" | "insert"> = Core.ClientMethod

/**
 * Fiber reference for the ClickHouse `query_id` applied to queries and
 * inserts; a random UUID is generated when no query ID is set.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const QueryId: Context.Reference<string | undefined> = Core.QueryId

/**
 * Fiber reference containing ClickHouse settings to attach to queries,
 * commands, and inserts.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const ClickhouseSettings: Context.Reference<
  NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
> = Core.ClickhouseSettings as Context.Reference<NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>>

/**
 * Provides both `ClickhouseClient` and generic `SqlClient` services from a
 * `Config`-backed ClickHouse client configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig: (
  config: Config.Wrap<ClickhouseClientConfig>
) => Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError> = (
  config: Config.Wrap<ClickhouseClientConfig>
): Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  Core.layer(ClickhouseClient, Effect.flatMap(Config.unwrap(config), make))

/**
 * Provides both `ClickhouseClient` and generic `SqlClient` services from a
 * ClickHouse client configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: ClickhouseClientConfig
): Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  Core.layer(ClickhouseClient, make(config))

/**
 * Creates the SQL statement compiler for ClickHouse, emitting typed
 * `{pN: Type}` placeholders and escaping identifiers with an optional query
 * name transform.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler: (transform?: (_: string) => string) => Statement.Compiler = Core.makeCompiler

/**
 * Custom SQL fragment type used for ClickHouse typed parameters created by
 * `ClickhouseClient.param`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type ClickhouseCustom = Core.ClickhouseCustom
