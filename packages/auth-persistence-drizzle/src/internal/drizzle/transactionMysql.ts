import * as Predicate from "effect/Predicate"
import type * as Scope from "effect/Scope"
/* oxlint-disable no-explicit-any -- this private acquisition preserves the installed native transaction; public wrappers retain its exact type. */
import type { SqlNativeCommit } from "@effect/auth-persistence/Adapter"
import { PersistenceMappingError } from "@effect/auth-persistence/Adapter"
import { EffectMysql2Transaction } from "drizzle-orm/effect-mysql2/session"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { makeWithTransaction, type SqlClient } from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"

interface MysqlTransactionScope {
  readonly client: SqlClient
  readonly transaction: SqlClient["withTransaction"]
  active: boolean
}

class CurrentMysqlTransaction extends Context.Service<
  CurrentMysqlTransaction,
  MysqlTransactionScope
>()("@effect/auth-persistence-drizzle/Mysql2/CurrentMysqlTransaction") {}

/**
 * The native handle reuses the physical owner's exact savepoint closure.
 *
 * @internal
 */
export const makeMysqlTransactionHandle = Effect.fnUntraced(function*(
  database: any
): Effect.fn.Return<EffectMysql2Transaction<any, any>, PersistenceMappingError> {
  const current = yield* Effect.serviceOption(CurrentMysqlTransaction)

  if (Option.isNone(current)) {
    return yield* PersistenceMappingError.make({
      operation: "transaction",
      cause: "MySQL transaction owner is required"
    })
  }
  const scope = current.value

  class NativeTransaction extends EffectMysql2Transaction<any, any> {
    override transaction<A, E, R>(body: (transaction: any) => Effect.Effect<A, E, R>) {
      return Effect.gen(function*() {
        const current = yield* Effect.serviceOption(CurrentMysqlTransaction)

        if (
          !scope.active ||
          Option.isNone(current) ||
          current.value !== scope ||
          scope.client.transactionService !== database.$client.transactionService
        ) {
          return yield* Effect.die(
            PersistenceMappingError.make({
              operation: "transaction",
              cause: "MySQL transaction handle escaped its owner"
            })
          )
        }

        return yield* scope.transaction(
          Effect.suspend(() => body(new NativeTransaction(database.dialect, database._.session, database._.relations)))
        )
      })
    }
  }

  return new NativeTransaction(database.dialect, database._.session, database._.relations)
})

/** Locking discovery and later SQL policy predicates must see the same current
 * authority. MySQL's default repeatable-read snapshot is unsuitable after a
 * contended authority lock. Own one connection and one-shot transaction mode;
 * the pooled connection's session default is never changed. */
const withMysqlTransaction = Effect.fnUntraced(function*<A, E, R, Failure>(
  unavailable: () => Failure,
  client: SqlClient,
  body: (transaction: SqlClient["withTransaction"]) => Effect.Effect<A, E, R>
): Effect.fn.Return<A, E | Failure | SqlError, R | Scope.Scope> {
  const connection = yield* client.reserve

  // Installed @effect/sql-mysql2 ConnectionImpl exposes its reserved native
  // PoolConnection as `conn`. Capture only its public disposal method; fail
  // before transaction work if an installed driver no longer provides it.
  const nativeConnection = (
    connection as {
      readonly conn?: { readonly destroy?: () => void; readonly release?: () => void }
    }
  ).conn

  if (
    !Predicate.isFunction(nativeConnection?.destroy) ||
    !Predicate.isFunction(nativeConnection.release)
  ) {
    return yield* Effect.fail(unavailable())
  }
  const destroy = nativeConnection.destroy.bind(nativeConnection)

  const defaults = yield* connection.executeUnprepared(
    "select @@session.transaction_isolation as isolation",
    [],
    undefined
  )

  const isolation = String(defaults[0]?.isolation).replaceAll("-", " ").toUpperCase()

  if (
    !["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"].includes(
      isolation
    )
  ) {
    return yield* Effect.fail(unavailable())
  }

  const statement = (source: string) => Effect.asVoid(connection.executeUnprepared(source, [], undefined))

  const transaction = makeWithTransaction({
    transactionService: client.transactionService,
    spanAttributes: [
      ["db.system", "mysql"],
      ["effect_auth.owner", "oauth"]
    ],
    acquireConnection: () => Effect.succeed(connection),
    begin: () =>
      statement("SET TRANSACTION ISOLATION LEVEL READ COMMITTED").pipe(
        Effect.andThen(statement("BEGIN"))
      ),
    commit: () => statement("COMMIT"),
    rollback: () => statement("ROLLBACK"),
    savepoint: (_connection, id) => statement(`SAVEPOINT effect_auth_oauth_${id}`),
    releaseSavepoint: (_connection, id) => statement(`RELEASE SAVEPOINT effect_auth_oauth_${id}`),
    rollbackSavepoint: (_connection, id) => statement(`ROLLBACK TO SAVEPOINT effect_auth_oauth_${id}`)
  })

  const cleanup = statement("ROLLBACK").pipe(
    Effect.andThen(statement(`SET TRANSACTION ISOLATION LEVEL ${isolation}`)),
    Effect.onExit((exit) => (exit._tag === "Failure" ? Effect.sync(destroy) : Effect.void)),
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.fromReasons<never>(
          cause.reasons.map((reason) =>
            Cause.isFailReason(reason)
              ? Cause.makeDieReason(reason.error).annotate(Cause.reasonAnnotations(reason))
              : reason
          )
        )
      )
    )
  )

  const scope: MysqlTransactionScope = { client, transaction, active: true }

  return yield* transaction(
    Effect.suspend(() => body(transaction)).pipe(
      Effect.provideService(CurrentMysqlTransaction, scope)
    )
  ).pipe(
    Effect.ensuring(
      Effect.sync(() => {
        scope.active = false
      })
    ),
    // BEGIN/COMMIT acknowledgments can be lost after the server acted.
    // Roll back any surviving transaction before resetting one-shot mode.
    // Failed cleanup destroys the connection before its reserve is released;
    // the unknown owner result cannot release a prepared receipt.
    Effect.ensuring(cleanup)
  )
}, Effect.scoped)

/**
 * Shared owner capability: one reserved connection, one-shot READ COMMITTED.
 *
 * @internal
 */
export const mysqlNativeCommit = (client: SqlClient): SqlNativeCommit["Service"] => ({
  client,
  withTransaction: (effect) =>
    withMysqlTransaction(
      () =>
        PersistenceMappingError.make({
          operation: "transaction",
          cause: "Unable to acquire MySQL transaction ownership"
        }),
      client,
      () => effect
    )
})
