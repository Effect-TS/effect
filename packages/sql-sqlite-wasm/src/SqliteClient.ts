/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as WaSqlite from "@effect/wa-sqlite"
import SQLiteESMFactory from "@effect/wa-sqlite/dist/wa-sqlite.mjs"
import { MemoryVFS } from "@effect/wa-sqlite/src/examples/MemoryVFS.js"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as ScopedRef from "effect/ScopedRef"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-sqlite-wasm/SqliteClient")

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
  readonly config: SqliteClientMemoryConfig
  readonly export: Effect.Effect<Uint8Array, SqlError>
  readonly import: (data: Uint8Array) => Effect.Effect<void, SqlError>

  /** Not supported in sqlite */
  readonly updateValues: never
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteClient = Context.GenericTag<SqliteClient>("@effect/sql-sqlite-wasm/SqliteClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClientMemoryConfig {
  readonly spanAttributes?: Record<string, unknown>
  readonly transformResultNames?: (str: string) => string
  readonly transformQueryNames?: (str: string) => string
}

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClientConfig {
  readonly worker: Effect.Effect<Worker | SharedWorker | MessagePort, never, Scope.Scope>
  readonly spanAttributes?: Record<string, unknown>
  readonly transformResultNames?: (str: string) => string
  readonly transformQueryNames?: (str: string) => string
}

interface SqliteConnection extends Connection {
  readonly export: Effect.Effect<Uint8Array, SqlError>
  readonly import: (data: Uint8Array) => Effect.Effect<void, SqlError>
}

const initModule = Effect.runSync(
  Effect.cached(Effect.promise(() => SQLiteESMFactory()))
)

const initEffect = Effect.runSync(
  Effect.cached(initModule.pipe(Effect.map((module) => WaSqlite.Factory(module))))
)

const registered = globalValue("@effect/sql-sqlite-wasm/registered", () => new Set<string>())

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeMemory = (options: SqliteClientMemoryConfig): Effect.Effect<SqliteClient, SqlError, Scope.Scope> =>
  Effect.gen(function*() {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = Statement.defaultTransforms(
      options.transformResultNames!
    ).array

    const makeConnection = Effect.gen(function*() {
      const sqlite3 = yield* initEffect

      if (registered.has("memory-vfs") === false) {
        registered.add("memory-vfs")
        const module = yield* initModule
        // @ts-expect-error
        const vfs = new MemoryVFS("memory-vfs", module)
        sqlite3.vfs_register(vfs as any, false)
      }
      const db = yield* Effect.acquireRelease(
        Effect.try({
          try: () => sqlite3.open_v2(":memory:", undefined, "memory-vfs"),
          catch: (cause) => new SqlError({ cause, message: "Failed to open database" })
        }),
        (db) => Effect.sync(() => sqlite3.close(db))
      )

      const run = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = [],
        rowMode: "object" | "array" = "object"
      ) =>
        Effect.try({
          try: () => {
            const results: Array<any> = []
            for (const stmt of sqlite3.statements(db, sql)) {
              let columns: Array<string> | undefined
              sqlite3.bind_collection(stmt, params as any)
              while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
                columns = columns ?? sqlite3.column_names(stmt)
                const row = sqlite3.row(stmt)
                if (rowMode === "object") {
                  const obj: Record<string, any> = {}
                  for (let i = 0; i < columns.length; i++) {
                    obj[columns[i]] = row[i]
                  }
                  results.push(obj)
                } else {
                  results.push(row)
                }
              }
            }
            return results
          },
          catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
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
          return run(sql, params, "array")
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
        export: Effect.try({
          try: () => sqlite3.serialize(db, "main"),
          catch: (cause) => new SqlError({ cause, message: "Failed to export database" })
        }),
        import(data) {
          return Effect.try({
            try: () => sqlite3.deserialize(db, "main", data, data.length, data.length, 1 | 2),
            catch: (cause) => new SqlError({ cause, message: "Failed to import database" })
          })
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
        [TypeId]: TypeId as TypeId,
        config: options
      }
    )
  })

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteClientConfig
): Effect.Effect<SqliteClient, SqlError, Scope.Scope> =>
  Effect.gen(function*(_) {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = Statement.defaultTransforms(
      options.transformResultNames!
    ).array
    const pending = new Map<number, (effect: Exit.Exit<any, SqlError>) => void>()

    const acquireWorker = Effect.gen(function*() {
      const scope = yield* Effect.scope
      const readyDeferred = yield* Deferred.make<void>()

      const worker = yield* options.worker
      const port = "port" in worker ? worker.port : worker
      yield* Scope.addFinalizer(scope, Effect.sync(() => port.postMessage(["close"])))

      const onMessage = (event: any) => {
        const [id, error, results] = event.data
        if (id === "ready") {
          Deferred.unsafeDone(readyDeferred, Exit.void)
          return
        }
        const resume = pending.get(id)
        if (!resume) return
        pending.delete(id)
        if (error) {
          resume(Exit.fail(new SqlError({ cause: error as string, message: "Failed to execute statement" })))
        } else {
          resume(Exit.succeed(results))
        }
      }
      port.addEventListener("message", onMessage)

      function onError() {
        Effect.runFork(ScopedRef.set(workerRef, acquireWorker))
      }
      if ("onerror" in worker) {
        worker.addEventListener("error", onError)
      }

      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          worker.removeEventListener("message", onMessage)
          worker.removeEventListener("error", onError)
        })
      )

      yield* Deferred.await(readyDeferred)
      return port
    })

    const workerRef = yield* ScopedRef.fromAcquire(acquireWorker)

    let currentId = 0

    const send = <A>(message: any, params: any, tranferables?: Array<any>) =>
      Effect.flatMap(ScopedRef.get(workerRef), (worker) =>
        Effect.async<A, SqlError>((resume) => {
          const id = currentId++
          pending.set(id, resume)
          worker.postMessage([id, message, params], tranferables!)
        }))

    const makeConnection = Effect.sync(() => {
      const run = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = [],
        rowMode: "object" | "array" = "object"
      ): Effect.Effect<Array<any>, SqlError, never> => {
        const rows = Effect.withFiberRuntime<[Array<string>, Array<any>], SqlError>((fiber) =>
          send(sql, params, fiber.getFiberRef(currentTransferables) as any)
        )
        return rowMode === "object"
          ? Effect.map(rows, extractObject)
          : Effect.map(rows, extractRows)
      }

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
          return run(sql, params, "array")
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
        export: send("export", undefined),
        import(data) {
          return send("import", data, [data.buffer])
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
        [TypeId]: TypeId as TypeId,
        config: options
      }
    )
  })

function rowToObject(columns: Array<string>, row: Array<any>) {
  const obj: Record<string, any> = {}
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[i]
  }
  return obj
}
const extractObject = (rows: [Array<string>, Array<any>]) => rows[1].map((row) => rowToObject(rows[0], row))
const extractRows = (rows: [Array<string>, Array<any>]) => rows[1]

/**
 * @category tranferables
 * @since 1.0.0
 */
export const currentTransferables: FiberRef.FiberRef<ReadonlyArray<Transferable>> = globalValue(
  "@effect/sql-sqlite-wasm/currentTransferables",
  () => FiberRef.unsafeMake<ReadonlyArray<Transferable>>([])
)

/**
 * @category tranferables
 * @since 1.0.0
 */
export const withTransferables =
  (transferables: ReadonlyArray<Transferable>) => <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.locally(effect, currentTransferables, transferables)

/**
 * @category layers
 * @since 1.0.0
 */
export const layerMemoryConfig = (
  config: Config.Config.Wrap<SqliteClientMemoryConfig>
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(makeMemory),
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
export const layerMemory = (
  config: SqliteClientMemoryConfig
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Effect.map(makeMemory(config), (client) =>
      Context.make(SqliteClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  )

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: SqliteClientConfig
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError | SqlError> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(SqliteClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  )

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: Config.Config.Wrap<SqliteClientConfig>
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError | SqlError> =>
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
