/**
 * @since 1.0.0
 */
import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

const ATTR_DB_SYSTEM_NAME = "db.system.name"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-sqlite-do/SqliteClient")

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

  /** Not supported in sqlite */
  readonly updateValues: never
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteClient = Context.GenericTag<SqliteClient>("@effect/sql-sqlite-do/SqliteClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClientConfig {
  readonly db: SqlStorage
  /**
   * The Durable Object storage (`ctx.storage`). When provided, transactions
   * use `storage.transaction()`, as workerd rejects transaction statements.
   */
  readonly storage?: DurableObjectStorage | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteClientConfig
): Effect.Effect<SqliteClient, never, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined

    const makeConnection = Effect.gen(function*() {
      const db = options.db

      function* runIterator(
        sql: string,
        params: ReadonlyArray<unknown> = []
      ) {
        const cursor = db.exec(sql, ...params)
        const columns = cursor.columnNames
        for (const result of cursor.raw()) {
          const obj: any = {}
          for (let i = 0; i < columns.length; i++) {
            const value = result[i]
            obj[columns[i]] = value instanceof ArrayBuffer ? new Uint8Array(value) : value
          }
          yield obj
        }
      }

      const runStatement = (
        sql: string,
        params: ReadonlyArray<unknown> = []
      ): Effect.Effect<ReadonlyArray<any>, SqlError, never> =>
        Effect.try({
          try: () => Array.from(runIterator(sql, params)),
          catch: (cause) => new SqlError({ cause, message: `Failed to execute statement` })
        })

      const runValues = (
        sql: string,
        params: ReadonlyArray<unknown> = []
      ): Effect.Effect<ReadonlyArray<any>, SqlError, never> =>
        Effect.try({
          try: () =>
            Array.from(db.exec(sql, ...params).raw(), (row) => {
              for (let i = 0; i < row.length; i++) {
                const value = row[i]
                if (value instanceof ArrayBuffer) {
                  row[i] = new Uint8Array(value) as any
                }
              }
              return row
            }),
          catch: (cause) => new SqlError({ cause, message: `Failed to execute statement` })
        })

      return identity<Connection>({
        execute(sql, params, transformRows) {
          return transformRows
            ? Effect.map(runStatement(sql, params), transformRows)
            : runStatement(sql, params)
        },
        executeRaw(sql, params) {
          return runStatement(sql, params)
        },
        executeValues(sql, params) {
          return runValues(sql, params)
        },
        executeUnprepared(sql, params, transformRows) {
          return transformRows
            ? Effect.map(runStatement(sql, params), transformRows)
            : runStatement(sql, params)
        },
        executeStream(sql, params, transformRows) {
          return Stream.suspend(() => {
            const iterator = runIterator(sql, params)
            return Stream.fromIteratorSucceed(iterator, 16)
          }).pipe(
            transformRows
              ? Stream.mapChunks((chunk) =>
                Chunk.unsafeFromArray(
                  transformRows(Chunk.toReadonlyArray(chunk))
                )
              )
              : identity
          )
        }
      })
    })

    const semaphore = yield* Effect.makeSemaphore(1)
    const connection = yield* makeConnection

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

    const spanAttributes: Array<[string, unknown]> = [
      ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
      [ATTR_DB_SYSTEM_NAME, "sqlite"]
    ]

    return Object.assign(
      (yield* Client.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes,
        transformRows
      })) as SqliteClient,
      {
        [TypeId]: TypeId as TypeId,
        config: options
      },
      options.storage ?
        {
          withTransaction: makeStorageWithTransaction(options.storage, connection, semaphore, spanAttributes)
        } :
        {}
    )
  })

const makeStorageWithTransaction = (
  storage: DurableObjectStorage,
  connection: Connection,
  semaphore: Effect.Semaphore,
  spanAttributes: ReadonlyArray<[string, unknown]>
): Client.SqlClient["withTransaction"] =>
<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | SqlError, R> =>
  Effect.flatMap(Effect.serviceOption(Client.TransactionConnection), (outer) => {
    if (outer._tag === "Some" && outer.value[0] !== connection) {
      return Effect.fail(
        new SqlError({ message: "Transactions cannot use a connection from a different SQL client" })
      )
    }
    const depth = outer._tag === "Some" ? outer.value[1] + 1 : 0
    const body = Effect.provideService(effect, Client.TransactionConnection, [connection, depth])

    const transaction = Effect.async<A, E | SqlError, R>((resume) => {
      let interrupted = false
      let complete: (() => void) | undefined
      const result: Promise<Exit.Exit<void, SqlError>> = storage.transaction((txn) =>
        new Promise<void>((resolve) => {
          complete = resolve
          if (interrupted) return resolve()
          resume(Effect.uninterruptibleMask((restore) =>
            Effect.flatMap(Effect.exit(restore(body)), (exit) => {
              if (Exit.isFailure(exit)) {
                txn.rollback()
              }
              // Rejecting would also abort the parent of a nested transaction
              resolve()
              return Effect.zipRight(Effect.flatten(Effect.promise(() => result)), exit)
            })
          ))
        })
      ).then(
        () => Exit.void,
        (cause) => {
          const exit = Exit.fail(new SqlError({ cause, message: "Failed to execute transaction" }))
          // Only reaches the fiber if the transaction failed before running the body
          resume(exit)
          return exit
        }
      )
      return Effect.suspend(() => {
        interrupted = true
        complete?.()
        return Effect.asVoid(Effect.promise(() => result))
      })
    })

    return depth === 0 ? semaphore.withPermits(1)(transaction) : transaction
  }).pipe(
    Effect.withSpan("sql.transaction", {
      kind: "client",
      captureStackTrace: false,
      attributes: Object.fromEntries(spanAttributes)
    }),
    // The storage transaction closes the input gate, which blocks scheduler
    // tasks until it completes
    Effect.withMaxOpsBeforeYield(Infinity)
  )

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
  ).pipe(Layer.provide(Reactivity.layer))

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
  ).pipe(Layer.provide(Reactivity.layer))
