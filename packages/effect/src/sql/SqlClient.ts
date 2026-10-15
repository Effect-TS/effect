/**
 * Main SQL client service for tagged-template queries.
 *
 * `SqlClient` combines the tagged-template statement constructor with
 * connection acquisition, dialect compilation, transactions, row transforms,
 * tracing, and reactive query helpers. Driver integrations build this service
 * from their connection and compiler pieces.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "../Cause.ts"
import { Clock } from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import { identity } from "../Function.ts"
import * as Option from "../Option.ts"
import { hasProperty } from "../Predicate.ts"
import type * as Queue from "../Queue.ts"
import { Reactivity } from "../reactivity/Reactivity.ts"
import type { ReadonlyRecord } from "../Record.ts"
import * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Stream from "../Stream.ts"
import * as Tracer from "../Tracer.ts"
import type { NoInfer } from "../Types.ts"
import type * as Connection from "./SqlConnection.ts"
import { ConnectionError, SqlError } from "./SqlError.ts"
import type { Compiler, Constructor } from "./Statement.ts"
import * as Statement from "./Statement.ts"

const TypeId = "~effect/sql/SqlClient"

/**
 * SQL client service interface, combining the statement constructor API with
 * connection reservation, transaction handling, and reactive query helpers.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface SqlClient extends Constructor {
  readonly [TypeId]: typeof TypeId

  /**
   * Copy of the client for safeql etc.
   */
  readonly safe: this

  /**
   * Copy of the client without transformations.
   */
  readonly withoutTransforms: () => this

  readonly reserve: Effect.Effect<Connection.Connection, SqlError, Scope.Scope>

  /**
   * Identifies the driver that created this client.
   *
   * **Details**
   *
   * Effect drivers use their package name without the `@effect/sql-` prefix,
   * such as `"pg"`, `"pglite"` or `"sqlite-node"`. Unlike the compiler
   * dialect, it distinguishes drivers that share a SQL dialect but manage
   * connections differently.
   */
  readonly driver: string

  /**
   * With the given effect, ensure all sql queries are run in a transaction.
   */
  readonly withTransaction: <R, E, A>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | SqlError, R>

  /**
   * The transaction service for this client.
   */
  readonly transactionService: Context.Service<TransactionConnection, TransactionConnection.Service>

  /**
   * Runs `effect` once the outermost transaction of this client commits, or
   * immediately, and interruptibly, when no transaction is open.
   *
   * **When to use**
   *
   * Use to signal committed changes, such as waking workers, invalidating
   * caches or notifying subscribers.
   *
   * **Details**
   *
   * Callbacks are discarded if the transaction rolls back or its `COMMIT`
   * fails. Callbacks registered in a savepoint that rolls back are discarded
   * even if the outer transaction commits.
   *
   * After a successful `COMMIT`, callbacks run in registration order once
   * releasing the connection has been attempted, before `withTransaction`
   * returns. They run uninterruptibly, even if the fiber was interrupted or
   * releasing the connection failed, in the context of the outermost
   * `withTransaction` call without the transaction, so a callback that
   * queries uses a new connection. A callback that dies is logged and the
   * rest still run.
   *
   * **Gotchas**
   *
   * Callbacks are lost if the process exits before they run or the outcome of
   * `COMMIT` is unknown, so work that must happen belongs in a table written
   * in the same transaction. `withTransaction` waits for callbacks and can't
   * be interrupted meanwhile, so keep them short and fork long-running work.
   * Registering after the transaction has ended is a defect.
   */
  readonly afterCommit: (effect: Effect.Effect<void>) => Effect.Effect<void>

  /**
   * Use the Reactivity service to create a reactive query.
   */
  readonly reactive: <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    effect: Effect.Effect<A, E, R>
  ) => Stream.Stream<A, E, R>

  /**
   * Use the Reactivity service to create a reactive
   * query.
   */
  readonly reactiveMailbox: <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<Queue.Dequeue<A, E>, never, R | Scope.Scope>
}

/**
 * Service tag for the active SQL client service.
 *
 * **When to use**
 *
 * Use to access or provide the SQL client used to build statements, stream
 * rows, reserve connections, and run transactions.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const SqlClient = Context.Service<SqlClient>("effect/sql/SqlClient")

/**
 * Namespace containing types associated with the `SqlClient` service.
 *
 * @stability unstable
 * @since 4.0.0
 */
export declare namespace SqlClient {
  /**
   * Options used to construct a `SqlClient`, including connection acquirers,
   * the SQL compiler, transaction SQL, row transformation, tracing attributes,
   * and optional reactive query integration.
   *
   * @stability unstable
   * @category options
   * @since 4.0.0
   */
  export interface MakeOptions {
    readonly acquirer: Connection.Acquirer
    /**
     * Lends a connection for one statement instead of leasing one into a
     * scope. A client that can do this saves the scope and finalizer per
     * statement; `stream`, transactions, and `reserve` keep the `acquirer`,
     * whose lease outlives the effect that starts it.
     */
    readonly borrower?: Connection.Borrower | undefined
    readonly compiler: Compiler
    readonly transactionAcquirer?: Connection.Acquirer
    /**
     * Identifies the driver creating the client, exposed as `SqlClient.driver`.
     */
    readonly driver: string
    readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>
    readonly transactionService?: Context.Service<TransactionConnection, TransactionConnection.Service>
    /**
     * Whether the transaction control statements - `BEGIN`, `COMMIT`,
     * `ROLLBACK`, and the savepoint pair - can be prepared like any other
     * statement.
     *
     * **Details**
     *
     * They run on every transaction and never change, so a database that can
     * prepare them stops parsing them again each time. Off by default,
     * because several databases refuse to prepare transaction control at all;
     * a driver has to say that its own does not.
     */
    readonly prepareTransactionControls?: boolean | undefined
    readonly beginTransaction?: string | undefined
    readonly rollback?: string | undefined
    /** Commit SQL, or an effect that commits on the connection and checks the result. */
    readonly commit?: string | ((conn: Connection.Connection) => Effect.Effect<void, SqlError>) | undefined
    /** Cleanup on the same connection when COMMIT fails. Omit when the driver already ends the transaction. */
    readonly onCommitFailure?: ((conn: Connection.Connection) => Effect.Effect<void, SqlError>) | undefined
    readonly savepoint?: ((name: string) => string) | undefined
    /**
     * SQL to release a nested savepoint after success or a successful rollback.
     * Omit to leave savepoints unreleased, including for dialects such as MSSQL
     * that do not support releasing savepoints.
     */
    readonly releaseSavepoint?: ((name: string) => string) | undefined
    readonly rollbackSavepoint?: ((name: string) => string) | undefined
    readonly transformRows?: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
    readonly reactiveQueue?: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<Queue.Dequeue<A, E>, never, R | Scope.Scope>
  }
}

let clientIdCounter = 0
let transactionSemaphoreIdCounter = 0

/**
 * Constructs a `SqlClient` from connection acquirers, a compiler, transaction
 * commands, tracing attributes, optional row transforms, and reactive query
 * integration.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options: SqlClient.MakeOptions) {
  const transactionService = options.transactionService ?? TransactionConnection(clientIdCounter++)
  const getConnection = Effect.flatMap(
    Effect.serviceOption(transactionService),
    Option.match({
      onNone: () => options.acquirer,
      onSome: ([conn]) => Effect.succeed(conn)
    })
  )

  const beginTransaction = options.beginTransaction ?? "BEGIN"
  const commit = options.commit ?? "COMMIT"
  const savepoint = options.savepoint ?? ((name: string) => `SAVEPOINT ${name}`)
  const releaseSavepoint = options.releaseSavepoint
  const rollback = options.rollback ?? "ROLLBACK"
  const rollbackSavepoint = options.rollbackSavepoint ?? ((name: string) => `ROLLBACK TO SAVEPOINT ${name}`)
  const transactionAcquirer = options.transactionAcquirer ?? options.acquirer
  const control = options.prepareTransactionControls === true
    ? (conn: Connection.Connection, sql: string) => conn.execute(sql, [], undefined)
    : (conn: Connection.Connection, sql: string) => conn.executeUnprepared(sql, [], undefined)
  const withTransaction = makeWithTransaction({
    transactionService,
    spanAttributes: options.spanAttributes,
    acquireConnection: Effect.flatMap(
      Scope.make(),
      (scope) =>
        Scope.provide(transactionAcquirer!, scope).pipe(
          Effect.onError((cause) => Scope.close(scope, Exit.failCause(cause))),
          Effect.map((conn) => [scope, conn] as const)
        )
    ),
    begin: (conn) => control(conn, beginTransaction),
    savepoint: (conn, id) => control(conn, savepoint(`effect_sql_${id}`)),
    releaseSavepoint: releaseSavepoint
      ? (conn, id) => control(conn, releaseSavepoint(`effect_sql_${id}`))
      : undefined,
    commit: typeof commit === "string" ? (conn) => control(conn, commit) : commit,
    onCommitFailure: options.onCommitFailure,
    rollback: (conn) => control(conn, rollback),
    rollbackSavepoint: (conn, id) => control(conn, rollbackSavepoint(`effect_sql_${id}`))
  })

  const reactivity = yield* Reactivity
  // A statement inside a transaction has to run on that transaction's
  // connection, so borrowing is only for statements that reach the pool.
  const borrower: Connection.Borrower | undefined = options.borrower === undefined ? undefined : (f) =>
    Effect.flatMap(
      Effect.serviceOption(transactionService),
      Option.match({
        onNone: () => options.borrower!(f),
        onSome: ([conn]) => f(conn)
      })
    )

  const client: SqlClient = Object.assign(
    Statement.make(getConnection, options.compiler, options.spanAttributes, options.transformRows, borrower),
    {
      [TypeId]: TypeId as typeof TypeId,
      safe: undefined as any,
      withTransaction,
      transactionService,
      reserve: transactionAcquirer,
      driver: options.driver,
      afterCommit: makeAfterCommit(transactionService),
      withoutTransforms(): any {
        if (options.transformRows === undefined) {
          return this
        }
        const statement = Statement.make(
          getConnection,
          options.compiler.withoutTransform,
          options.spanAttributes,
          undefined,
          borrower
        )
        const client = Object.assign(statement, {
          ...this,
          ...statement
        })
        ;(client as any).safe = client
        ;(client as any).withoutTransforms = () => client
        return client
      },
      reactive: options.reactiveQueue ?
        <A, E, R>(
          keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
          effect: Effect.Effect<A, E, R>
        ) =>
          options.reactiveQueue!(keys, effect).pipe(
            Effect.map(Stream.fromQueue),
            Stream.unwrap
          ) :
        reactivity.stream,
      reactiveMailbox: options.reactiveQueue ?? reactivity.query
    }
  )
  ;(client as any).safe = client

  return client
})

/**
 * Builds the acquirers, borrower and failed-COMMIT cleanup for a SQLite client that
 * shares one connection through a semaphore.
 *
 * **Details**
 *
 * Both acquirers lease the connection into the current scope and hold the
 * semaphore until that scope closes. The borrower holds the same semaphore
 * until the statement finishes without creating a scope. Another fiber cannot
 * begin a transaction underneath either. Effects that use the connection directly,
 * such as an export, have to run inside `Effect.scoped`.
 *
 * SQLite can keep a transaction open after COMMIT fails, for example on a
 * deferred foreign key violation. `onCommitFailure` rolls it back before the
 * connection is reused. If that ROLLBACK fails, the connection is rejected, and
 * each acquisition or borrow retries the ROLLBACK once while holding the semaphore
 * until it succeeds. The database is never reopened, and transactions started with a
 * plain `BEGIN` are only touched after a failed cleanup.
 *
 * Pass `isTransaction` when the driver can report whether a transaction is
 * open. Without it, ROLLBACK always runs and SQLite's "no transaction is
 * active" error counts as clean.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeSqliteAcquirers = <C extends Connection.Connection>(options: {
  readonly connection: Effect.Effect<C, SqlError>
  readonly semaphore: Semaphore.Semaphore
  readonly isTransaction?: ((conn: C) => boolean) | undefined
}): {
  readonly acquirer: Effect.Effect<C, SqlError, Scope.Scope>
  readonly borrower: Connection.Borrower
  readonly transactionAcquirer: Effect.Effect<C, SqlError, Scope.Scope>
  readonly onCommitFailure: (conn: Connection.Connection) => Effect.Effect<void, SqlError>
} => {
  const { isTransaction, semaphore } = options
  let poisoned: SqlError | undefined
  const poison = (cause: Cause.Cause<SqlError>) =>
    poisoned = new SqlError({
      reason: new ConnectionError({
        message: "SQLite connection cannot be reused after failed COMMIT cleanup",
        operation: "rollback",
        cause
      })
    })

  const rollback = (conn: C): Effect.Effect<void, SqlError> => {
    if (isTransaction) {
      return isTransaction(conn) ? Effect.asVoid(conn.executeUnprepared("ROLLBACK", [], undefined)) : Effect.void
    }
    return conn.executeUnprepared("ROLLBACK", [], undefined).pipe(
      Effect.asVoid,
      Effect.catchIf(isNoTransactionError, () => Effect.void)
    )
  }

  const available = Effect.flatMap(options.connection, (conn) => {
    if (poisoned === undefined) return Effect.succeed(conn)
    return Effect.matchCauseEffect(rollback(conn), {
      onFailure: (cause) => Effect.fail(poison(cause)),
      onSuccess: () => {
        poisoned = undefined
        return Effect.succeed(conn)
      }
    })
  })

  const lease = Effect.uninterruptibleMask((restore) =>
    Effect.flatMap(Effect.scope, (scope) =>
      restore(semaphore.take(1)).pipe(
        Effect.andThen(Scope.addFinalizer(scope, semaphore.release(1))),
        Effect.andThen(available)
      ))
  )

  return {
    acquirer: lease,
    borrower: (f) => semaphore.withPermit(Effect.flatMap(available, f)),
    transactionAcquirer: lease,
    onCommitFailure: (conn) => Effect.tapCause(rollback(conn as C), (cause) => Effect.sync(() => poison(cause)))
  }
}

const isNoTransactionError = (error: SqlError): boolean => {
  const cause = error.reason.cause
  const message = typeof cause === "string"
    ? cause
    : hasProperty(cause, "message") && typeof cause.message === "string"
    ? cause.message
    : ""
  return /no transaction is active/i.test(message)
}

/**
 * A failed COMMIT cleanup leaves the connection in an unsafe state, so both the
 * COMMIT error and the cleanup error are promoted to defects: typed recovery
 * must not be able to hide them.
 */
const failuresToDefects = <E>(cause: Cause.Cause<E>): Cause.Cause<never> =>
  Cause.fromReasons(cause.reasons.map((reason) =>
    Cause.isFailReason(reason)
      ? Cause.makeDieReason(reason.error).annotate(Cause.reasonAnnotations(reason))
      : reason
  ))

/**
 * One level of a transaction: the outermost transaction or a savepoint.
 * `committed` is set once the level's changes are committed, regardless of
 * how the level later exits.
 */
interface AfterCommitLevel {
  readonly parent: AfterCommitLevel | undefined
  /** Shared by every level of the transaction, in registration order. */
  readonly callbacks: Array<AfterCommitCallback>
  /** The transaction service value the level was provided with. */
  transaction: unknown
  open: boolean
  committed: boolean
}

interface AfterCommitCallback {
  readonly level: AfterCommitLevel
  readonly effect: Effect.Effect<void>
}

/** Keyed by the client's transaction service, so each client tracks its own levels. */
const afterCommitLevel = <I, S>(transactionService: Context.Key<I, S>) =>
  Context.Service<AfterCommitLevel>(`${transactionService.key}/AfterCommit`)

/**
 * `undefined` outside a transaction, `null` in a transaction that doesn't
 * track `afterCommit`. A level only matches the transaction it was provided
 * with, so a transaction started after removing the transaction service is a
 * new outermost level.
 */
const currentLevel = <I, S>(
  context: Context.Context<never>,
  transactionService: Context.Key<I, S>,
  levelService: Context.Key<AfterCommitLevel, AfterCommitLevel>
): AfterCommitLevel | null | undefined => {
  const transaction = Context.getOrUndefined(context, transactionService)
  if (transaction === undefined) {
    return undefined
  }
  const level = Context.getOrUndefined(context, levelService)
  return level !== undefined && level.transaction === transaction ? level : null
}

/** A level is open only while it and every enclosing level are open. */
const isOpen = (level: AfterCommitLevel): boolean => {
  for (let current: AfterCommitLevel | undefined = level; current !== undefined; current = current.parent) {
    if (!current.open) {
      return false
    }
  }
  return true
}

const runAfterCommit = (callback: Effect.Effect<void>): Effect.Effect<void> =>
  Effect.catchCause(callback, (cause) => Effect.logError("SqlClient.afterCommit callback failed", cause))

/** A callback runs only if its level and every enclosing level committed. */
const isCommitted = (level: AfterCommitLevel | undefined): boolean => {
  for (let current = level; current !== undefined; current = current.parent) {
    if (!current.committed) {
      return false
    }
  }
  return true
}

/** When the outermost level ends committed, runs the callbacks of committed levels in order. */
const endAfterCommitLevel = (level: AfterCommitLevel): Effect.Effect<void> => {
  level.open = false
  if (level.parent !== undefined || !level.committed) {
    return Effect.void
  }
  return Effect.forEach(
    level.callbacks,
    (callback) => isCommitted(callback.level) ? runAfterCommit(callback.effect) : Effect.void,
    { discard: true }
  )
}

/**
 * Builds `SqlClient.afterCommit` for the transactions of the client whose
 * transaction service is `transactionService`.
 *
 * **When to use**
 *
 * Use when building a `SqlClient` without `make`.
 *
 * @stability unstable
 * @category transactions
 * @since 4.0.6
 */
export const makeAfterCommit = <I, S>(
  transactionService: Context.Key<I, S>
): (effect: Effect.Effect<void>) => Effect.Effect<void> => {
  const levelService = afterCommitLevel(transactionService)
  return (callback) =>
    Effect.withFiber((fiber) => {
      const level = currentLevel(fiber.context, transactionService, levelService)
      // Outside a transaction, or in one that doesn't track callbacks.
      if (level == null) {
        return runAfterCommit(callback)
      }
      if (!isOpen(level)) {
        return Effect.die(new Error("SqlClient.afterCommit: the transaction has already ended"))
      }
      level.callbacks.push({ level, effect: callback })
      return Effect.void
    })
}

const untrackedLevel = {
  provide: identity,
  markCommitted: Effect.void
}

/**
 * Tracks one level of a client's transaction for `afterCommit`.
 *
 * **When to use**
 *
 * Use when a driver implements transactions without `makeWithTransaction`.
 *
 * **Details**
 *
 * `transaction` receives the level. Pass the body's context, including the
 * transaction service, through `level.provide` and provide the result to the
 * body. Run `level.markCommitted` once the level's changes are committed:
 * after `COMMIT` for the outermost level, or when a savepoint's body
 * succeeds. However `transaction` exits, the outermost level then runs the
 * callbacks of every committed level in registration order, in the context
 * `withAfterCommit` was called in. Wrap everything that must finish first,
 * including releasing the connection.
 *
 * **Gotchas**
 *
 * Run `level.markCommitted` where it can't be interrupted, such as a
 * finalizer. In a transaction of the client that wasn't started through
 * `withAfterCommit`, callbacks run immediately.
 *
 * @stability unstable
 * @category transactions
 * @since 4.0.6
 */
export const withAfterCommit = <I, S>(transactionService: Context.Key<I, S>) => {
  const levelService = afterCommitLevel(transactionService)
  return <A, E, R>(
    transaction: (level: {
      readonly provide: <Services>(context: Context.Context<Services>) => Context.Context<Services>
      readonly markCommitted: Effect.Effect<void>
    }) => Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> =>
    Effect.withFiber((fiber) => {
      const parent = currentLevel(fiber.context, transactionService, levelService)
      if (parent === null) {
        // The surrounding transaction doesn't track callbacks, so they run immediately.
        return transaction(untrackedLevel)
      }
      const current: AfterCommitLevel = {
        parent,
        callbacks: parent === undefined ? [] : parent.callbacks,
        transaction: undefined,
        open: true,
        committed: false
      }
      return Effect.ensuring(
        transaction({
          provide: (context) => {
            current.transaction = Context.getOrUndefined(context, transactionService)
            return Context.add(context, levelService, current)
          },
          markCommitted: Effect.sync(() => {
            current.committed = true
          })
        }),
        Effect.suspend(() => endAfterCommitLevel(current))
      )
    })
}

/**
 * Builds a transaction wrapper that begins top-level transactions, uses
 * savepoints for nested transactions, commits on success, and rolls back on
 * failure or interruption. Releases nested savepoints when `releaseSavepoint`
 * is provided. Runs `afterCommit` callbacks once the top-level transaction has
 * committed and released its connection.
 *
 * @stability unstable
 * @category transactions
 * @since 4.0.0
 */
export const makeWithTransaction = <I, S>(options: {
  readonly transactionService: Context.Key<I, readonly [conn: S, counter: number]>
  readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>
  readonly acquireConnection: Effect.Effect<readonly [Scope.Closeable | undefined, S], SqlError>
  readonly begin: (conn: NoInfer<S>) => Effect.Effect<void, SqlError>
  readonly savepoint: (conn: NoInfer<S>, id: number) => Effect.Effect<void, SqlError>
  /**
   * Releases a nested savepoint after success or a successful rollback.
   * Omit to leave savepoints unreleased, including for dialects such as MSSQL
   * that do not support releasing savepoints.
   */
  readonly releaseSavepoint?: ((conn: NoInfer<S>, id: number) => Effect.Effect<void, SqlError>) | undefined
  readonly commit: (conn: NoInfer<S>) => Effect.Effect<void, SqlError>
  /** Driver-specific recovery before the connection is released after a failed COMMIT. */
  readonly onCommitFailure?: ((conn: NoInfer<S>) => Effect.Effect<void, SqlError>) | undefined
  readonly rollback: (conn: NoInfer<S>) => Effect.Effect<void, SqlError>
  readonly rollbackSavepoint: (conn: NoInfer<S>, id: number) => Effect.Effect<void, SqlError>
}) => {
  const transactionSemaphore = Context.Service<Semaphore.Semaphore>(
    `effect/sql/SqlClient/TransactionSemaphore/${transactionSemaphoreIdCounter++}`
  )
  const afterCommit = withAfterCommit(options.transactionService)
  return <R, E, A>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | SqlError, R> =>
    Effect.uninterruptibleMask((restore) =>
      afterCommit((level) =>
        Effect.useSpan(
          "sql.transaction",
          { kind: "internal" },
          (span) =>
            Effect.withFiber<A, E | SqlError, R>((fiber) => {
              for (const [key, value] of options.spanAttributes) {
                span.attribute(key, value)
              }
              const services = fiber.context
              const clock = fiber.getRef(Clock)
              const connOption = Context.getOption(services, options.transactionService)
              const conn = connOption._tag === "Some"
                ? Effect.succeed([undefined, connOption.value[0]] as const)
                : options.acquireConnection
              const id = connOption._tag === "Some" ? connOption.value[1] + 1 : 0
              const transaction = Effect.flatMap(
                conn,
                (
                  [scope, conn]
                ) =>
                  (id === 0 ? options.begin(conn) : options.savepoint(conn, id)).pipe(
                    Effect.flatMap(() =>
                      Effect.onExitPrimitive(
                        Effect.provideContext(
                          restore(effect),
                          services.pipe(
                            Context.add(options.transactionService, [conn, id]),
                            Context.add(transactionSemaphore, Semaphore.makeUnsafe(1)),
                            Context.add(Tracer.ParentSpan, span),
                            level.provide
                          )
                        ),
                        (exit) => {
                          let effect: Effect.Effect<void, SqlError>
                          if (Exit.isSuccess(exit)) {
                            if (id === 0) {
                              span.event("effect.sql.transaction.commit", clock.currentTimeNanosUnsafe())
                              const onCommitFailure = options.onCommitFailure
                              effect = Effect.andThen(
                                onCommitFailure
                                  ? Effect.catchCause(options.commit(conn), (commitCause) =>
                                    Effect.matchCauseEffect(onCommitFailure(conn), {
                                      onFailure: (cleanupCause) =>
                                        Effect.failCause(failuresToDefects(Cause.combine(commitCause, cleanupCause))),
                                      onSuccess: () => Effect.failCause(commitCause)
                                    }))
                                  : options.commit(conn),
                                level.markCommitted
                              )
                            } else {
                              span.event("effect.sql.transaction.savepoint", clock.currentTimeNanosUnsafe())
                              effect = level.markCommitted
                            }
                          } else {
                            span.event("effect.sql.transaction.rollback", clock.currentTimeNanosUnsafe())
                            effect = Effect.orDie(
                              id > 0
                                ? options.rollbackSavepoint(conn, id)
                                : options.rollback(conn)
                            )
                          }
                          if (id > 0 && options.releaseSavepoint) {
                            effect = Effect.andThen(effect, Effect.orDie(options.releaseSavepoint(conn, id)))
                          }
                          return Effect.flatMap(effect, () => exit)
                        },
                        true
                      )
                    ),
                    scope ? (eff) => Effect.onExitPrimitive(eff, (exit) => Scope.close(scope, exit), true) : identity
                  )
              )
              return id === 0
                ? transaction
                : Context.getUnsafe(services, transactionSemaphore).withPermit(transaction)
            })
        )
      )
    )
}

/**
 * Phantom identifier for the scoped transaction connection service associated
 * with a SQL client.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface TransactionConnection {
  readonly _: unique symbol
}

/**
 * Namespace containing types associated with transaction connection services.
 *
 * @stability unstable
 * @since 4.0.0
 */
export declare namespace TransactionConnection {
  /**
   * Service payload stored during a transaction, containing the active
   * connection and nested transaction depth.
   *
   * @stability unstable
   * @category services
   * @since 4.0.0
   */
  export type Service = readonly [conn: Connection.Connection, depth: number]
}

/**
 * Creates a unique context service tag for the active transaction connection of
 * a specific SQL client.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const TransactionConnection = (
  clientId: number
): Context.Service<TransactionConnection, TransactionConnection.Service> =>
  Context.Service(`effect/sql/SqlClient/TransactionConnection/${clientId}`)

/**
 * Context reference used by SQL integrations to opt in to safe integer
 * handling; defaults to `false`.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const SafeIntegers = Context.Reference<boolean>("effect/sql/SqlClient/SafeIntegers", {
  defaultValue: () => false
})
