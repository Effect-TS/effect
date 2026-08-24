/**
 * Connects Effect SQL to PostgreSQL using the native wire protocol client.
 *
 * This module provides constructors and layers for building a PostgreSQL
 * client from pool settings or one managed connection. The client runs Effect
 * SQL queries against PostgreSQL, including transactions and streamed results,
 * and adds helpers for JSON values and LISTEN/NOTIFY messages.
 *
 * @since 4.0.0
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Client from "effect/unstable/sql/SqlClient"
import type { Connection } from "effect/unstable/sql/SqlConnection"
import type { SqlError } from "effect/unstable/sql/SqlError"
import type { Custom, Fragment } from "effect/unstable/sql/Statement"
import * as Statement from "effect/unstable/sql/Statement"
import type { Duplex } from "node:stream"
import type { ConnectionOptions } from "node:tls"
import * as PgConnection from "./PgConnection.ts"
import * as PgPool from "./PgPool.ts"
import * as PgTypes from "./PgTypes.ts"

/**
 * Runtime type identifier used to mark `PgClient` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~@effect/sql-pg/PgClient"

/**
 * Type-level identifier used to mark `PgClient` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~@effect/sql-pg/PgClient"

/**
 * PostgreSQL client service, extending `SqlClient` with JSON parameter fragments and LISTEN/NOTIFY helpers.
 *
 * @category services
 * @since 4.0.0
 */
export interface PgClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: PgClientConfig
  readonly json: (_: unknown) => Fragment
  readonly listen: (channel: string) => Stream.Stream<string, SqlError>
  readonly notify: (channel: string, payload: string) => Effect.Effect<void, SqlError>
}

/**
 * Service tag for the PostgreSQL client service.
 *
 * **When to use**
 *
 * Use to access or provide a PostgreSQL client through the Effect context.
 *
 * @category services
 * @since 4.0.0
 */
export const PgClient = Context.Service<PgClient>("@effect/sql-pg/PgClient")

/**
 * Configuration for a PostgreSQL client, including connection, TLS, custom stream, application name, type parser, JSON transform, and query/result name transform options.
 *
 * @category models
 * @since 4.0.0
 */
export interface PgClientConfig {
  readonly url?: Redacted.Redacted | undefined

  readonly host?: string | undefined
  readonly port?: number | undefined
  readonly path?: string | undefined
  readonly ssl?: boolean | ConnectionOptions | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined

  readonly connectTimeout?: Duration.Input | undefined

  readonly stream?: (() => Duplex) | undefined

  readonly applicationName?: string | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
  readonly transformJson?: boolean | undefined
  readonly types?: PgTypes.Registry | undefined
  /** Allows multiple fibers to share a pooled connection between pinned operations. */
  readonly multiplex?: boolean | undefined
  /**
   * Keeps statements prepared under a backend name, so a repeated statement
   * skips parsing and planning. On by default. Turn it off for a connection
   * pooler that cannot keep named statements between statements.
   */
  readonly prepare?: boolean | undefined
  /** How many statements a connection keeps prepared. Defaults to `100`. */
  readonly preparedStatementCacheSize?: number | undefined
}

/**
 * PostgreSQL pool configuration, extending `PgClientConfig` with idle timeout, pool size, and connection lifetime settings.
 *
 * @category models
 * @since 4.0.0
 */
export interface PgPoolConfig extends PgClientConfig {
  readonly idleTimeout?: Duration.Input | undefined

  readonly maxConnections?: number | undefined
  readonly minConnections?: number | undefined
  readonly connectionTTL?: Duration.Input | undefined
}

/**
 * Creates a scoped PostgreSQL client backed by a native connection pool.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: PgPoolConfig): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.flatMap(PgPool.make(options), (pool) =>
    makeImpl({
      acquirer: Effect.map(pool.get, makeConnection),
      transactionAcquirer: Effect.map(pool.reserve, makeConnection),
      listenAcquirer: pool.reserve,
      config: options
    }))

/**
 * Creates a scoped PostgreSQL client backed by one native connection.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeClient = (
  options: PgClientConfig
): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.flatMap(PgConnection.make(options), (connection) =>
    makeImpl({
      acquirer: Effect.succeed(makeConnection(connection)),
      transactionAcquirer: Effect.map(connection.pin, makeConnection),
      listenAcquirer: connection.pin,
      config: options
    }))

/**
 * Builds the shared SQL facade around native connection acquirers.
 */
const makeImpl = Effect.fnUntraced(function*(
  options: {
    readonly acquirer: Effect.Effect<Connection, SqlError, Scope.Scope>
    readonly transactionAcquirer: Effect.Effect<Connection, SqlError, Scope.Scope>
    readonly listenAcquirer: Effect.Effect<PgConnection.PgConnection, SqlError, Scope.Scope>
    readonly config: PgClientConfig
  }
): Effect.fn.Return<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity> {
  const compiler = makeCompiler(
    options.config.transformQueryNames,
    options.config.transformJson
  )
  const transformRows = options.config.transformResultNames ?
    Statement.defaultTransforms(
      options.config.transformResultNames,
      options.config.transformJson
    ).array :
    undefined

  const config = options.config

  return Object.assign(
    yield* Client.make({
      acquirer: options.acquirer,
      transactionAcquirer: options.transactionAcquirer,
      compiler,
      spanAttributes: [
        ...(config.spanAttributes ? Object.entries(config.spanAttributes) : []),
        [ATTR_DB_SYSTEM_NAME, "postgresql"],
        [ATTR_DB_NAMESPACE, config.database ?? config.username ?? "postgres"],
        [ATTR_SERVER_ADDRESS, config.host ?? "localhost"],
        [ATTR_SERVER_PORT, config.port ?? 5432]
      ],
      transformRows
    }),
    {
      [TypeId]: TypeId as TypeId,
      config: options.config,
      json: (_: unknown) => Statement.fragment([PgJson(_)]),
      listen: (channel: string) =>
        Stream.unwrap(
          Effect.map(options.listenAcquirer, (connection) =>
            connection.listen(channel).pipe(
              Stream.map((notification) => notification.payload),
              Stream.filter((payload) => payload.length > 0)
            ))
        ),
      notify: (channel: string, payload: string) =>
        Effect.asVoid(Effect.scoped(Effect.flatMap(
          options.acquirer,
          (conn) => conn.executeRaw(`SELECT pg_notify($1, $2)`, [channel, payload])
        )))
    }
  )
})

class ConnectionImpl implements Connection {
  readonly connection: PgConnection.PgConnection

  constructor(connection: PgConnection.PgConnection) {
    this.connection = connection
  }

  private run(query: string, params: ReadonlyArray<unknown>) {
    return Effect.map(this.connection.query(query, params), (result) => result.rows)
  }

  execute(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    return transformRows
      ? Effect.map(this.run(sql, params), transformRows)
      : this.run(sql, params)
  }
  executeRaw(sql: string, params: ReadonlyArray<unknown>) {
    return this.connection.query(sql, params)
  }
  executeWithoutTransform(sql: string, params: ReadonlyArray<unknown>) {
    return this.run(sql, params)
  }
  executeValues(sql: string, params: ReadonlyArray<unknown>) {
    return this.connection.queryValues(sql, params)
  }
  executeValuesUnprepared(sql: string, params: ReadonlyArray<unknown>) {
    return this.executeValues(sql, params)
  }
  executeUnprepared(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    return this.execute(sql, params, transformRows)
  }
  executeStream(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) {
    const stream = this.connection.stream(sql, params)
    return transformRows
      ? Stream.map(stream, (row) => transformRows([row])[0])
      : stream
  }
}

const makeConnection = (connection: PgConnection.PgConnection): Connection => new ConnectionImpl(connection)

/**
 * Creates a layer from an effect that acquires a `PgClient`, providing both `PgClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerFrom = <E, R>(
  acquire: Effect.Effect<PgClient, E, R>
): Layer.Layer<PgClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>> =>
  Layer.effectContext(
    Effect.map(acquire, (client) =>
      Context.make(PgClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer)) as any

/**
 * Creates a layer from a `Config`-wrapped PostgreSQL pool configuration, providing both `PgClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig: (
  config: Config.Wrap<PgPoolConfig>
) => Layer.Layer<PgClient | Client.SqlClient, Config.ConfigError | SqlError> = (
  config: Config.Wrap<PgPoolConfig>
): Layer.Layer<PgClient | Client.SqlClient, Config.ConfigError | SqlError> =>
  layerFrom(Effect.flatMap(
    Config.unwrap(config),
    make
  ))

/**
 * Creates a layer from a concrete PostgreSQL pool configuration, providing both `PgClient` and `SqlClient`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  config: PgPoolConfig
): Layer.Layer<PgClient | Client.SqlClient, SqlError> => layerFrom(make(config))

/**
 * Creates the PostgreSQL statement compiler, using `$1` placeholders, double-quoted identifiers, PostgreSQL returning clauses, and optional JSON value transformation.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeCompiler = (
  transform?: (_: string) => string,
  transformJson = true
): Statement.Compiler => {
  const transformValue = transformJson && transform
    ? Statement.defaultTransforms(transform).value
    : undefined

  return Statement.makeCompiler<PgCustom>({
    dialect: "pg",
    placeholder(_) {
      return `$${_}`
    },
    onIdentifier: transform ?
      function(value, withoutTransform) {
        return withoutTransform ? escape(value) : escape(transform(value))
      } :
      escape,
    onRecordUpdate(placeholders, valueAlias, valueColumns, values, returning) {
      return [
        `(values ${placeholders}) AS ${valueAlias}${valueColumns}${returning ? ` RETURNING ${returning[0]}` : ""}`,
        returning ?
          values.flat().concat(returning[1]) :
          values.flat()
      ]
    },
    onCustom(type, placeholder, withoutTransform) {
      switch (type.kind) {
        case "PgJson": {
          const value = withoutTransform || transformValue === undefined
            ? type.paramA
            : transformValue(type.paramA)
          return [
            placeholder(undefined),
            [PgTypes.jsonb(value)]
          ]
        }
      }
    }
  })
}

const escape = Statement.defaultEscape("\"")

/**
 * PostgreSQL-specific custom statement fragments supported by the compiler, currently JSON parameter fragments.
 *
 * @category models
 * @since 4.0.0
 */
export type PgCustom = PgJson

/**
 * @category models
 * @since 4.0.0
 */
interface PgJson extends Custom<"PgJson", unknown> {}
/**
 * @category constructors
 * @since 4.0.0
 */
const PgJson = Statement.custom<PgJson>("PgJson")

const ATTR_DB_SYSTEM_NAME = "db.system.name"
const ATTR_DB_NAMESPACE = "db.namespace"
const ATTR_SERVER_ADDRESS = "server.address"
const ATTR_SERVER_PORT = "server.port"
