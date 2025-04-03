/**
 * @since 1.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import type { Custom, Fragment, Primitive } from "@effect/sql/Statement"
import * as Statement from "@effect/sql/Statement"
import type { Extensions, InitializedExtensions, PGliteOptions } from "@electric-sql/pglite"
import { PGlite } from "@electric-sql/pglite"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-pglite/PgLiteClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface PgLiteClient<TExtensions extends Extensions = Extensions> extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: PgLiteClientConfig<TExtensions>
  readonly json: (_: unknown) => Fragment
  readonly array: (_: ReadonlyArray<Primitive>) => Fragment
  readonly listen: (channel: string) => Stream.Stream<string, SqlError>
  readonly notify: (channel: string, payload: string) => Effect.Effect<void, SqlError>
  readonly extensions: InitializedExtensions<TExtensions>
}

/**
 * @category tags
 * @since 1.0.0
 */
export const PgLiteClient = Context.GenericTag<PgLiteClient<any>>("@effect/sql-pglite/PgLiteClient")

/**
 * Returns the tag for PgLiteClient with types added for extensions.
 * Use this when you need to preserve extension types when retrieving the client from context.
 *
 * @example
 * ```ts
 * import { PgLiteClient } from "@effect/sql-pglite"
 * import { Effect } from "effect"
 *
 * // Create a tag for your client with extensions
 * export const MyClient = PgLiteClient.tag<{
 * 	// vector: typeof vector
 * }>()
 *
 * // Use the tag to retrieve the client with correct extension types
 * const program = Effect.gen(function*() {
 *   const client = yield* MyClient
 *   // client.extensions.vector is properly typed
 * })
 * ```
 *
 * @category tags
 * @since 1.0.0
 */
export const tag = <TExtensions extends Extensions>() =>
  PgLiteClient as Context.Tag<PgLiteClient<TExtensions>, PgLiteClient<TExtensions>>

/**
 * @category constructors
 * @since 1.0.0
 */
export interface PgLiteClientConfig<TExtensions extends Extensions = Extensions> extends PGliteOptions<TExtensions> {
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
  readonly transformJson?: boolean | undefined
  readonly applicationName?: string | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <TExtensions extends Extensions = Extensions>(
  options: PgLiteClientConfig<TExtensions>
): Effect.Effect<PgLiteClient<Extensions>, SqlError, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = makeCompiler(options.transformQueryNames, options.transformJson)
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames, options.transformJson).array
      : undefined

    // Create PGlite instance
    const client: PGlite = yield* Effect.tryPromise({
      try: () =>
        PGlite.create(
          options.dataDir || "",
          options
        ),
      catch: (cause) => new SqlError({ cause, message: "PgLiteClient: Failed to connect" })
    })

    yield* Effect.tryPromise({
      try: () => client.query("SELECT 1"),
      catch: (cause) => new SqlError({ cause, message: "PgLiteClient: Failed to query" })
    })

    class ConnectionImpl implements Connection {
      constructor(private readonly pg: PGlite) {}

      private run(query: Promise<any>) {
        return Effect.async<ReadonlyArray<any>, SqlError>((resume) => {
          query.then(
            (result) => {
              resume(Effect.succeed(result.rows))
            },
            (cause) => {
              resume(new SqlError({ cause, message: "Failed to execute statement" }))
            }
          )
          // PGlite doesn't have a cancel method like postgres.js
          return Effect.succeed(void 0)
        })
      }

      execute(
        sql: string,
        params: ReadonlyArray<Primitive>,
        transformRows?: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
        unprepared?: boolean
      ) {
        return transformRows
          ? Effect.map(
            this.run(
              unprepared ? this.pg.exec(sql, params as any) : this.pg.query(sql, params as any)
            ),
            transformRows
          )
          : unprepared
          ? this.run(this.pg.exec(sql, params as any))
          : this.run(this.pg.query(sql, params as any))
      }
      executeRaw(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(this.pg.exec(sql, params as any))
      }
      executeWithoutTransform(sql: string, params: ReadonlyArray<Primitive>) {
        return this.run(this.pg.query(sql, params as any))
      }
      executeValues(sql: string, params: ReadonlyArray<Primitive>) {
        // PGlite doesn't have a values() method like postgres.js
        // We'll just return the regular query results
        return this.run(this.pg.query(sql, params as any))
      }
      executeUnprepared(
        sql: string,
        params: ReadonlyArray<Primitive>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        return this.execute(sql, params, transformRows, true)
      }
      executeStream(
        sql: string,
        params: ReadonlyArray<Primitive>,
        transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
      ) {
        // PGlite doesn't have a cursor method like postgres.js
        // We'll fetch all results at once and convert to a stream
        return Stream.fromEffect(
          Effect.map(this.run(this.pg.query(sql, params as any)), (rows) => {
            const result = transformRows ? transformRows(rows) : rows
            return result
          })
        ).pipe(Stream.flatMap(Stream.fromIterable))
      }
    }

    return Object.assign(
      yield* Client.make({
        acquirer: Effect.succeed(new ConnectionImpl(client)),
        compiler,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [Otel.SEMATTRS_DB_SYSTEM, Otel.DBSYSTEMVALUES_POSTGRESQL],
          [Otel.SEMATTRS_DB_NAME, options.database ?? options.username ?? "postgres"],
          ["server.address", "localhost"],
          ["server.port", 0]
        ],
        transformRows
      }),
      {
        [TypeId]: TypeId as TypeId,
        config: {
          ...options
        },
        json: (_: unknown) => PgLiteJson([_]),
        array: (_: ReadonlyArray<Primitive>) => PgLiteArray([_]),
        extensions: options.extensions ? (client as any) : ({} as any),
        listen: (channel: string) =>
          Stream.asyncPush<string, SqlError>((emit) =>
            Effect.tryPromise({
              try: async () => {
                const unsub = await client.listen(channel, (payload) => emit.single(payload))
                return { unsub }
              },
              catch: (cause) => new SqlError({ cause, message: "Failed to listen" })
            }).pipe(
              Effect.map(({ unsub }) =>
                Effect.tryPromise({
                  try: () => unsub(),
                  catch: (cause) => new SqlError({ cause, message: "Failed to unlisten" })
                })
              )
            )
          ),
        notify: (channel: string, payload: string) =>
          Effect.tryPromise({
            try: () => client.query(`NOTIFY ${channel}, '${payload}'`),
            catch: (cause) => new SqlError({ cause, message: "Failed to notify" })
          }).pipe(Effect.map(() => void 0))
      }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = <TExtensions extends Extensions = Extensions>(
  config: Config.Config.Wrap<PgLiteClientConfig<TExtensions>>
): Layer.Layer<PgLiteClient<TExtensions> | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make<TExtensions>),
      Effect.map((client) =>
        Context.make(PgLiteClient, client as PgLiteClient<TExtensions>).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = <Extensions extends Record<string, any> = {}>(
  config: PgLiteClientConfig & { extensions?: Extensions }
): Layer.Layer<PgLiteClient<Extensions> | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Effect.map(make<Extensions>(config), (client) =>
      Context.make(PgLiteClient, client as PgLiteClient<Extensions>).pipe(
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
  const transformValue = transformJson && transform ? Statement.defaultTransforms(transform).value : undefined

  return Statement.makeCompiler<PgLiteCustom>({
    dialect: "pg",
    placeholder(_) {
      return `$${_}`
    },
    onIdentifier: transform
      ? function(value, withoutTransform) {
        return withoutTransform ? escape(value) : escape(transform(value))
      }
      : escape,
    onRecordUpdate(placeholders, valueAlias, valueColumns, values, returning) {
      return [
        `(values ${placeholders}) AS ${valueAlias}${valueColumns}${returning ? ` RETURNING ${returning[0]}` : ""}`,
        returning ? values.flat().concat(returning[1]) : values.flat()
      ]
    },
    onCustom(type: PgLiteCustom, placeholder, withoutTransform) {
      switch (type.kind) {
        case "PgLiteJson": {
          const value = withoutTransform || transformValue === undefined
            ? type.i0[0]
            : transformValue(type.i0[0])
          return [placeholder(undefined), [value]]
        }
        case "PgLiteArray": {
          const arrayValue = type.i0[0]
          return [placeholder(undefined), [arrayValue]]
        }
        default: {
          throw new Error(`Unknown custom type: ${type}`)
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
export type PgLiteCustom = PgLiteJson | PgLiteArray

/**
 * @category custom types
 * @since 1.0.0
 */
export interface PgLiteJson extends Custom<"PgLiteJson", [unknown]> {}

/**
 * @category custom types
 * @since 1.0.0
 */
export const PgLiteJson = Statement.custom<PgLiteJson>("PgLiteJson")

/**
 * @category custom types
 * @since 1.0.0
 */
export interface PgLiteArray extends Custom<"PgLiteArray", [ReadonlyArray<Primitive>]> {}

/**
 * @category custom types
 * @since 1.0.0
 */
export const PgLiteArray = Statement.custom<PgLiteArray>("PgLiteArray")
