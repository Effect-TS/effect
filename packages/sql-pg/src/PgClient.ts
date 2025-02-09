/**
 * @since 1.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import type { Custom, Fragment, Primitive } from "@effect/sql/Statement"
import * as Statement from "@effect/sql/Statement"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as NodeStream from "node:stream"
import type { ConnectionOptions } from "node:tls"
import postgres from "postgres"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-pg/PgClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface PgClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: PgClientConfig
  readonly json: (_: unknown) => Fragment
  readonly array: (_: ReadonlyArray<Primitive>) => Fragment
  readonly listen: (channel: string) => Stream.Stream<string, SqlError>
  readonly notify: (channel: string, payload: string) => Effect.Effect<void, SqlError>
}

/**
 * @category tags
 * @since 1.0.0
 */
export const PgClient = Context.GenericTag<PgClient>("@effect/sql-pg/PgClient")

/**
 * @category constructors
 * @since 1.0.0
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

  /**
   * A function returning a custom socket to use. This parameter is not documented
   * in the postgres.js's type signature. See their
   * [readme](https://github.com/porsager/postgres?tab=readme-ov-file#connection-details) instead.
   *
   * @example
   * ```ts
   * import { AuthTypes, Connector } from "@google-cloud/cloud-sql-connector";
   * import { PgClient } from "@effect/sql-pg";
   * import { Config, Effect, Layer } from "effect"
   *
   * const layer = Effect.gen(function*() {
   *   const connector = new Connector();
   *   const clientOpts = yield* Effect.promise(() => connector.getOptions({
   *     instanceConnectionName: "project:region:instance",
   *     authType: AuthTypes.IAM,
   *   }));
   *   return PgClient.layer({ socket: clientOpts.stream, username: "iam-user" });
   * }).pipe(Layer.unwrapEffect)
   * ```
   */
  readonly socket?: (() => NodeStream.Duplex) | undefined

  readonly idleTimeout?: Duration.DurationInput | undefined
  readonly connectTimeout?: Duration.DurationInput | undefined

  readonly maxConnections?: number | undefined
  readonly connectionTTL?: Duration.DurationInput | undefined

  readonly applicationName?: string | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
  readonly transformJson?: boolean | undefined
  readonly fetchTypes?: boolean | undefined
  readonly prepare?: boolean | undefined
  /**
   * A callback when postgres has a notice, see
   * [readme](https://github.com/porsager/postgres?tab=readme-ov-file#connection-details).
   * By default, postgres.js logs these with console.log.
   * To silence notices, see the following example:
   * @example
   * ```ts
   * import { PgClient } from "@effect/sql-pg";
   * import { Config, Layer } from "effect"
   *
   * const layer = PgClient.layer({ onnotice: Config.succeed(() => {}) })
   * ```
   */
  readonly onnotice?: (notice: postgres.Notice) => void
  readonly types?: Record<string, postgres.PostgresType> | undefined

  readonly debug?: postgres.Options<{}>["debug"] | undefined
}

type PartialWithUndefined<T> = { [K in keyof T]?: T[K] | undefined }

interface PostgresOptions extends postgres.Options<{}> {
  readonly socket?: (() => NodeStream.Duplex) | undefined
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = (
  options: PgClientConfig
): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*(_) {
    const compiler = makeCompiler(
      options.transformQueryNames,
      options.transformJson
    )
    const transformRows = options.transformResultNames ?
      Statement.defaultTransforms(
        options.transformResultNames,
        options.transformJson
      ).array :
      undefined

    const opts: PartialWithUndefined<PostgresOptions> = {
      max: options.maxConnections ?? 10,
      max_lifetime: options.connectionTTL
        ? Math.round(
          Duration.toMillis(Duration.decode(options.connectionTTL)) / 1000
        )
        : undefined,
      idle_timeout: options.idleTimeout
        ? Math.round(
          Duration.toMillis(Duration.decode(options.idleTimeout)) / 1000
        )
        : undefined,
      connect_timeout: options.connectTimeout
        ? Math.round(
          Duration.toMillis(Duration.decode(options.connectTimeout)) / 1000
        )
        : undefined,

      host: options.host,
      port: options.port,
      ssl: options.ssl,
      path: options.path,
      database: options.database,
      username: options.username,
      password: options.password ? Redacted.value(options.password) : undefined,
      fetch_types: options.fetchTypes ?? true,
      prepare: options.prepare ?? true,
      onnotice: options.onnotice,
      types: options.types,
      debug: options.debug,
      connection: {
        application_name: options.applicationName ?? "@effect/sql-pg"
      },
      socket: options.socket
    }

    const client = options.url
      ? postgres(Redacted.value(options.url), opts as any)
      : postgres(opts as any)

    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => client`select 1`,
        catch: (cause) => new SqlError({ cause, message: "PgClient: Failed to connect" })
      }),
      () => Effect.promise(() => client.end())
    ).pipe(
      Effect.timeoutFail({
        duration: options.connectTimeout ?? Duration.seconds(5),
        onTimeout: () =>
          new SqlError({
            cause: new Error("Connection timed out"),
            message: "PgClient: Connection timed out"
          })
      })
    )

    class ConnectionImpl implements Connection {
      constructor(private readonly pg: postgres.Sql<{}>) {}

      private run(query: postgres.PendingQuery<any> | postgres.PendingValuesQuery<any>) {
        return Effect.async<ReadonlyArray<any>, SqlError>((resume) => {
          query.then(
            (_) => resume(Effect.succeed(_)),
            (cause) => resume(new SqlError({ cause, message: "Failed to execute statement" }))
          )
          return Effect.sync(() => query.cancel())
        })
      }

      execute(
        sql: string,
        params: ReadonlyArray<Primitive>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return transformRows
          ? Effect.map(this.run(this.pg.unsafe(sql, params as any)), transformRows)
          : this.run(this.pg.unsafe(sql, params as any))
      }
      executeRaw(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(this.pg.unsafe(sql, params as any))
      }
      executeWithoutTransform(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(this.pg.unsafe(sql, params as any))
      }
      executeValues(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(this.pg.unsafe(sql, params as any).values())
      }
      executeUnprepared(
        sql: string,
        params: ReadonlyArray<Primitive>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return this.execute(sql, params, transformRows)
      }
      executeStream(
        sql: string,
        params: ReadonlyArray<Primitive>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return Stream.mapChunks(
          Stream.fromAsyncIterable(
            this.pg.unsafe(sql, params as any).cursor(16) as AsyncIterable<
              Array<any>
            >,
            (cause) => new SqlError({ cause, message: "Failed to execute statement" })
          ),
          Chunk.flatMap((rows) => Chunk.unsafeFromArray(transformRows ? transformRows(rows) : rows))
        )
      }
    }

    return Object.assign(
      yield* Client.make({
        acquirer: Effect.succeed(new ConnectionImpl(client)),
        transactionAcquirer: Effect.map(
          Effect.acquireRelease(
            Effect.tryPromise({
              try: () => client.reserve(),
              catch: (cause) => new SqlError({ cause, message: "Failed to reserve connection" })
            }),
            (pg) => Effect.sync(() => pg.release())
          ),
          (_) => new ConnectionImpl(_)
        ),
        compiler,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [Otel.SEMATTRS_DB_SYSTEM, Otel.DBSYSTEMVALUES_POSTGRESQL],
          [Otel.SEMATTRS_DB_NAME, opts.database ?? options.username ?? "postgres"],
          ["server.address", opts.host ?? "localhost"],
          ["server.port", opts.port ?? 5432]
        ],
        transformRows
      }),
      {
        [TypeId]: TypeId as TypeId,
        config: {
          ...options,
          host: client.options.host[0] ?? undefined,
          port: client.options.port[0] ?? undefined,
          username: client.options.user,
          password: client.options.pass ? Redacted.make(client.options.pass) : undefined,
          database: client.options.database
        },
        json: (_: unknown) => PgJson(_),
        array: (_: ReadonlyArray<Primitive>) => PgArray(_),
        listen: (channel: string) =>
          Stream.asyncPush<string, SqlError>((emit) =>
            Effect.acquireRelease(
              Effect.tryPromise({
                try: () => client.listen(channel, (payload) => emit.single(payload)),
                catch: (cause) => new SqlError({ cause, message: "Failed to listen" })
              }),
              ({ unlisten }) => Effect.promise(() => unlisten())
            )
          ),
        notify: (channel: string, payload: string) =>
          Effect.tryPromise({
            try: () => client.notify(channel, payload),
            catch: (cause) => new SqlError({ cause, message: "Failed to notify" })
          })
      }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: Config.Config.Wrap<PgClientConfig>
): Layer.Layer<PgClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(PgClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: PgClientConfig
): Layer.Layer<PgClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(PgClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeCompiler = (
  transform?: (_: string) => string,
  transformJson = true
): Statement.Compiler => {
  const pg = postgres({ max: 0 })

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
          return [
            placeholder(undefined),
            [
              pg.json(
                withoutTransform || transformValue === undefined
                  ? type.i0
                  : transformValue(type.i0)
              ) as any
            ]
          ]
        }
        case "PgArray": {
          const param = pg.array(type.i0 as any) as any
          const first = type.i0[0]
          switch (typeof first) {
            case "boolean": {
              param.type = 1000
              break
            }
            case "number": {
              param.type = 1022
              break
            }
            default: {
              param.type = 1009
              break
            }
          }
          return [placeholder(undefined), [param]]
        }
      }
    }
  })
}

const escape = Statement.defaultEscape("\"")

/**
 * @category custom types
 * @since 1.0.0
 */
export type PgCustom = PgJson | PgArray

/**
 * @category custom types
 * @since 1.0.0
 */
interface PgJson extends Custom<"PgJson", unknown> {}
/**
 * @category custom types
 * @since 1.0.0
 */
const PgJson = Statement.custom<PgJson>("PgJson")

/**
 * @category custom types
 * @since 1.0.0
 */
interface PgArray extends Custom<"PgArray", ReadonlyArray<Primitive>> {}
/**
 * @category custom types
 * @since 1.0.0
 */
const PgArray = Statement.custom<PgArray>("PgArray")
