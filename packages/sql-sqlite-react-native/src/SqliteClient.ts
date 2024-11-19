/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Sqlite from "@op-engineering/op-sqlite"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-sqlite-react-native/SqliteClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: SqliteClientConfig
  readonly reactive: <A>(
    statement: Statement.Statement<A>,
    fireOn: ReadonlyArray<{
      readonly table: string
      readonly ids?: ReadonlyArray<number>
    }>
  ) => Stream.Stream<ReadonlyArray<A>, SqlError>

  /** Not supported in sqlite */
  readonly updateValues: never
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteClient = Context.GenericTag<SqliteClient>("@effect/sql-sqlite-react-native/SqliteClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClientConfig {
  readonly filename: string
  readonly location?: string | undefined
  readonly encryptionKey?: string | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * @category fiber refs
 * @since 1.0.0
 */
export const asyncQuery: FiberRef.FiberRef<boolean> = globalValue(
  "@effect/sql-sqlite-react-native/Client/asyncQuery",
  () => FiberRef.unsafeMake(false)
)

/**
 * @category fiber refs
 * @since 1.0.0
 */
export const withAsyncQuery = <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.locally(effect, asyncQuery, true)

interface SqliteConnection extends Connection {
  readonly reactive: <A>(
    statement: Statement.Statement<A>,
    fireOn: ReadonlyArray<{
      readonly table: string
      readonly ids?: ReadonlyArray<number>
    }>
  ) => Stream.Stream<ReadonlyArray<A>, SqlError>
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteClientConfig
): Effect.Effect<SqliteClient, never, Scope.Scope> =>
  Effect.gen(function*(_) {
    const clientOptions: Parameters<typeof Sqlite.open>[0] = {
      name: options.filename
    }
    if (options.location) {
      clientOptions.location = options.location
    }
    if (options.encryptionKey) {
      clientOptions.encryptionKey = options.encryptionKey
    }

    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = Statement.defaultTransforms(
      options.transformResultNames!
    ).array

    const makeConnection = Effect.gen(function*(_) {
      const db = Sqlite.open(clientOptions)
      yield* _(Effect.addFinalizer(() => Effect.sync(() => db.close())))

      const run = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = []
      ) =>
        Effect.withFiberRuntime<Array<any>, SqlError>((fiber) => {
          if (fiber.getFiberRef(asyncQuery)) {
            return Effect.map(
              Effect.tryPromise({
                try: () => db.executeAsync(sql, params as Array<any>),
                catch: (cause) => new SqlError({ cause, message: "Failed to execute statement (async)" })
              }),
              (result) => result.rows?._array ?? []
            )
          }
          return Effect.try({
            try: () => db.execute(sql, params as Array<any>).rows?._array ?? [],
            catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
          })
        })

      const runTransform = options.transformResultNames
        ? (sql: string, params?: ReadonlyArray<Statement.Primitive>) => Effect.map(run(sql, params), transformRows)
        : run

      return identity<SqliteConnection>({
        execute(sql, params) {
          return runTransform(sql, params)
        },
        executeRaw(sql, params) {
          return run(sql, params)
        },
        executeValues(sql, params) {
          return Effect.map(run(sql, params), (results) => {
            if (results.length === 0) {
              return []
            }
            const columns = Object.keys(results[0])
            return results.map((row) => columns.map((column) => row[column]))
          })
        },
        executeWithoutTransform(sql, params) {
          return run(sql, params)
        },
        executeUnprepared(sql, params) {
          return runTransform(sql, params)
        },
        executeStream() {
          return Effect.dieMessage("executeStream not implemented")
        },
        reactive<A>(
          statement: Statement.Statement<A>,
          fireOn: ReadonlyArray<{
            readonly table: string
            readonly ids?: ReadonlyArray<number>
          }>
        ) {
          const [query, params] = statement.compile()
          return Queue.sliding<ReadonlyArray<A>>(1).pipe(
            Effect.tap((queue) =>
              this.execute(query, params).pipe(
                Effect.flatMap((rows) => queue.offer(rows))
              )
            ),
            Effect.tap((queue) =>
              Effect.acquireRelease(
                Effect.try({
                  try: () =>
                    db.reactiveExecute({
                      query,
                      arguments: params as any,
                      fireOn: fireOn as any,
                      callback(data) {
                        queue.unsafeOffer(data.rows)
                      }
                    }),
                  catch: (cause) => new SqlError({ cause, message: "Failed to execute statement (reactive)" })
                }),
                (cancel) => Effect.sync(cancel)
              )
            ),
            Effect.map(Stream.fromQueue),
            Stream.unwrapScoped
          )
        }
      })
    })

    const semaphore = yield* _(Effect.makeSemaphore(1))
    const connection = yield* _(makeConnection)

    const acquirer = semaphore.withPermits(1)(Effect.succeed(connection))
    const transactionAcquirer = Effect.uninterruptibleMask((restore) =>
      Effect.as(
        Effect.zipRight(
          restore(semaphore.take(1)),
          Effect.tap(
            Effect.scope,
            (scope) => Scope.addFinalizer(scope, semaphore.release(1))
          )
        ),
        connection
      )
    )

    return Object.assign(
      Client.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [Otel.SEMATTRS_DB_SYSTEM, Otel.DBSYSTEMVALUES_SQLITE]
        ]
      }) as SqliteClient,
      {
        [TypeId]: TypeId,
        config: options,
        reactive<A>(
          statement: Statement.Statement<A>,
          fireOn: ReadonlyArray<{
            readonly table: string
            readonly ids?: ReadonlyArray<number>
          }>
        ) {
          return Stream.unwrap(Effect.map(
            acquirer,
            (connection) => connection.reactive(statement, fireOn)
          ))
        }
      }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: Config.Config.Wrap<SqliteClientConfig>
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(SqliteClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  )

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: SqliteClientConfig
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(SqliteClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  )
