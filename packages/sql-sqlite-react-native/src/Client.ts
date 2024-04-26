/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import type { Connection } from "@effect/sql/Connection"
import { SqlError } from "@effect/sql/Error"
import * as Statement from "@effect/sql/Statement"
import * as Sqlite from "@op-engineering/op-sqlite"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClient extends Client.Client {
  readonly config: SqliteClientConfig
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteClient: Context.Tag<SqliteClient, SqliteClient> = Context.GenericTag(
  "@effect/sql-sqlite-react-native/SqliteClient"
)

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClientConfig {
  readonly filename: string
  readonly location?: string | undefined
  readonly encryptionKey?: string | undefined
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

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteClientConfig
): Effect.Effect<SqliteClient, never, Scope.Scope> =>
  Effect.gen(function*(_) {
    const compiler = makeCompiler(options.transformQueryNames)
    const transformRows = Client.defaultTransforms(
      options.transformResultNames!
    ).array

    const handleError = (error: any) => new SqlError({ error })

    const makeConnection = Effect.gen(function*(_) {
      const db = Sqlite.open({
        name: options.filename,
        location: options.location!,
        encryptionKey: options.encryptionKey!
      })
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
                catch: handleError
              }),
              (result) => result.rows?._array ?? []
            )
          }
          return Effect.try({
            try: () => db.execute(sql, params as Array<any>).rows?._array ?? [],
            catch: handleError
          })
        })

      const runTransform = options.transformResultNames
        ? (sql: string, params?: ReadonlyArray<Statement.Primitive>) => Effect.map(run(sql, params), transformRows)
        : run

      return identity<Connection>({
        execute(sql, params) {
          return runTransform(sql, params)
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
        executeRaw(sql, params) {
          return runTransform(sql, params)
        },
        executeStream() {
          return Effect.dieMessage("executeStream not implemented")
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
        spanAttributes: [["db.system", "sqlite"]]
      }),
      { config: options }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: Config.Config.Wrap<SqliteClientConfig>
): Layer.Layer<SqliteClient, ConfigError> =>
  Layer.scoped(
    SqliteClient,
    Effect.flatMap(Config.unwrap(config), make)
  )

const escape = Statement.defaultEscape("\"")

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler({
    placeholder: (_) => `?`,
    onIdentifier: transform ? (_) => escape(transform(_)) : escape,
    onRecordUpdate: () => ["", []],
    onCustom: () => ["", []]
  })
