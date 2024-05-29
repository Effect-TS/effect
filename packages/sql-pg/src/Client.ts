/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import type { Connection } from "@effect/sql/Connection"
import { SqlError } from "@effect/sql/Error"
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
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"
import type { PendingQuery, PendingValuesQuery } from "postgres"
import postgres from "postgres"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-pg/Client")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface PgClient extends Client.Client {
  readonly [TypeId]: TypeId
  readonly config: PgClientConfig
  readonly json: (_: unknown) => Fragment
  readonly array: (_: ReadonlyArray<Primitive>) => Fragment
}

/**
 * @category tags
 * @since 1.0.0
 */
export const PgClient = Context.GenericTag<PgClient>("@effect/sql-pg/Client")

/**
 * @category constructors
 * @since 1.0.0
 */
export interface PgClientConfig {
  readonly url?: Redacted.Redacted | undefined

  readonly host?: string | undefined
  readonly port?: number | undefined
  readonly path?: string | undefined
  readonly ssl?: boolean | undefined
  readonly database?: string | undefined
  readonly username?: string | undefined
  readonly password?: Redacted.Redacted | undefined

  readonly idleTimeout?: Duration.DurationInput | undefined
  readonly connectTimeout?: Duration.DurationInput | undefined

  readonly maxConnections?: number | undefined
  readonly connectionTTL?: Duration.DurationInput | undefined

  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
  readonly transformJson?: boolean | undefined
  readonly fetchTypes?: boolean | undefined
  readonly prepare?: boolean | undefined
  readonly types?: Record<string, postgres.PostgresType> | undefined

  readonly debug?: postgres.Options<{}>["debug"] | undefined
}

type PartialWithUndefined<T> = { [K in keyof T]?: T[K] | undefined }

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = (
  options: PgClientConfig
): Effect.Effect<PgClient, never, Scope> =>
  Effect.gen(function*(_) {
    const compiler = makeCompiler(
      options.transformQueryNames,
      options.transformJson
    )
    const transformRows = Statement.defaultTransforms(
      options.transformResultNames!,
      options.transformJson
    ).array

    const opts: PartialWithUndefined<postgres.Options<{}>> = {
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
      types: options.types,
      debug: options.debug
    }

    const client = options.url
      ? postgres(Redacted.value(options.url), opts as any)
      : postgres(opts as any)

    yield* _(Effect.addFinalizer(() => Effect.promise(() => client.end())))

    class ConnectionImpl implements Connection {
      constructor(private readonly pg: postgres.Sql<{}>) {}

      private run(query: PendingQuery<any> | PendingValuesQuery<any>) {
        return Effect.async<ReadonlyArray<any>, SqlError>((resume) => {
          query.then(
            (_) => resume(Effect.succeed(_)),
            (error) => resume(new SqlError({ error }))
          )
          return Effect.sync(() => query.cancel())
        })
      }

      private runTransform(query: PendingQuery<any>) {
        return options.transformResultNames
          ? Effect.map(this.run(query), transformRows)
          : this.run(query)
      }

      execute(sql: string, params: ReadonlyArray<Primitive>) {
        return this.runTransform(this.pg.unsafe(sql, params as any))
      }
      executeWithoutTransform(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(this.pg.unsafe(sql, params as any))
      }
      executeValues(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(this.pg.unsafe(sql, params as any).values())
      }
      executeRaw(sql: string, params?: ReadonlyArray<Primitive>) {
        return this.runTransform(this.pg.unsafe(sql, params as any))
      }
      executeStream(sql: string, params: ReadonlyArray<Primitive>) {
        return Stream.mapChunks(
          Stream.fromAsyncIterable(
            this.pg.unsafe(sql, params as any).cursor(16) as AsyncIterable<
              Array<any>
            >,
            (error) => new SqlError({ error })
          ),
          Chunk.flatMap((rows) =>
            Chunk.unsafeFromArray(
              options.transformResultNames ? transformRows(rows) : rows
            )
          )
        )
      }
    }

    return Object.assign(
      Client.make({
        acquirer: Effect.succeed(new ConnectionImpl(client)),
        transactionAcquirer: Effect.map(
          Effect.acquireRelease(
            Effect.tryPromise({
              try: () => client.reserve(),
              catch: (error) => new SqlError({ error })
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
        ]
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
        array: (_: ReadonlyArray<Primitive>) => PgArray(_)
      }
    )
  })

/**
 * @category constructor
 * @since 1.0.0
 */
export const layer = (
  config: Config.Config.Wrap<PgClientConfig>
): Layer.Layer<PgClient | Client.Client, ConfigError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(PgClient, client).pipe(
          Context.add(Client.Client, client)
        )
      )
    )
  )

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
            placeholder(),
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
          return [placeholder(), [param]]
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
