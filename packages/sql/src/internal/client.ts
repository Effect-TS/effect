import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"
import type { NoInfer } from "effect/Types"
import type * as Client from "../SqlClient.js"
import type * as Connection from "../SqlConnection.js"
import type * as Error from "../SqlError.js"
import * as Statement from "../Statement.js"

/** @internal */
export const TypeId: Client.TypeId = Symbol.for("@effect/sql/SqlClient") as Client.TypeId

/** @internal */
export const clientTag = Context.GenericTag<Client.SqlClient>("@effect/sql/SqlClient")

/** @internal */
export const TransactionConnection = Context.GenericTag<
  Client.TransactionConnection,
  readonly [conn: Connection.Connection, counter: number]
>("@effect/sql/SqlClient/TransactionConnection")

/** @internal */
export function make({
  acquirer,
  beginTransaction = "BEGIN",
  commit = "COMMIT",
  compiler,
  rollback = "ROLLBACK",
  rollbackSavepoint = (id) => `ROLLBACK TO SAVEPOINT ${id}`,
  savepoint = (id) => `SAVEPOINT ${id}`,
  spanAttributes,
  transactionAcquirer
}: Client.SqlClient.MakeOptions): Client.SqlClient {
  const getConnection = Effect.flatMap(
    Effect.serviceOption(TransactionConnection),
    Option.match({
      onNone: () => acquirer,
      onSome: ([conn]) => Effect.succeed(conn)
    })
  )

  transactionAcquirer = transactionAcquirer ?? acquirer
  const withTransaction = makeWithTransaction({
    transactionTag: TransactionConnection,
    spanAttributes,
    acquireConnection: Effect.flatMap(
      Scope.make(),
      (scope) => Effect.map(Scope.extend(transactionAcquirer, scope), (conn) => [scope, conn] as const)
    ),
    begin: (conn) => conn.executeUnprepared(beginTransaction),
    savepoint: (conn, id) => conn.executeUnprepared(savepoint(`effect_sql_${id}`)),
    commit: (conn) => conn.executeUnprepared(commit),
    rollback: (conn) => conn.executeUnprepared(rollback),
    rollbackSavepoint: (conn, id) => conn.executeUnprepared(rollbackSavepoint(`effect_sql_${id}`))
  })

  const client: Client.SqlClient = Object.assign(
    Statement.make(getConnection, compiler, spanAttributes),
    {
      [TypeId as Client.TypeId]: TypeId as Client.TypeId,
      safe: undefined as any,
      withTransaction,
      reserve: transactionAcquirer
    }
  )
  ;(client as any).safe = client

  return client
}

/** @internal */
export const makeWithTransaction = <I, S>(options: {
  readonly transactionTag: Context.Tag<I, readonly [conn: S, counter: number]>
  readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>
  readonly acquireConnection: Effect.Effect<readonly [Scope.CloseableScope | undefined, S], Error.SqlError>
  readonly begin: (conn: NoInfer<S>) => Effect.Effect<void, Error.SqlError>
  readonly savepoint: (conn: NoInfer<S>, id: number) => Effect.Effect<void, Error.SqlError>
  readonly commit: (conn: NoInfer<S>) => Effect.Effect<void, Error.SqlError>
  readonly rollback: (conn: NoInfer<S>) => Effect.Effect<void, Error.SqlError>
  readonly rollbackSavepoint: (conn: NoInfer<S>, id: number) => Effect.Effect<void, Error.SqlError>
}) =>
<R, E, A>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E | Error.SqlError, R> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.useSpan(
      "sql.transaction",
      { kind: "client", captureStackTrace: false },
      (span) =>
        Effect.withFiberRuntime<A, E | Error.SqlError, R>((fiber) => {
          for (const [key, value] of options.spanAttributes) {
            span.attribute(key, value)
          }
          const context = fiber.currentContext
          const clock = Context.get(fiber.currentDefaultServices, Clock.Clock)
          const connOption = Context.getOption(context, options.transactionTag)
          const conn = connOption._tag === "Some"
            ? Effect.succeed([undefined, connOption.value[0]] as const)
            : options.acquireConnection
          const id = connOption._tag === "Some" ? connOption.value[1] + 1 : 0
          return Effect.flatMap(
            conn,
            (
              [scope, conn]
            ) =>
              (id === 0 ? options.begin(conn) : options.savepoint(conn, id)).pipe(
                Effect.zipRight(Effect.locally(
                  restore(effect),
                  FiberRef.currentContext,
                  Context.add(context, options.transactionTag, [conn, id]).pipe(
                    Context.add(Tracer.ParentSpan, span)
                  )
                )),
                Effect.exit,
                Effect.flatMap((exit) => {
                  let effect: Effect.Effect<void>
                  if (Exit.isSuccess(exit)) {
                    if (id === 0) {
                      span.event("db.transaction.commit", clock.unsafeCurrentTimeNanos())
                      effect = Effect.orDie(options.commit(conn))
                    } else {
                      span.event("db.transaction.savepoint", clock.unsafeCurrentTimeNanos())
                      effect = Effect.void
                    }
                  } else {
                    span.event("db.transaction.rollback", clock.unsafeCurrentTimeNanos())
                    effect = Effect.orDie(
                      id > 0
                        ? options.rollbackSavepoint(conn, id)
                        : options.rollback(conn)
                    )
                  }
                  const withScope = scope !== undefined ? Effect.ensuring(effect, Scope.close(scope, exit)) : effect
                  return Effect.zipRight(withScope, exit)
                })
              )
          )
        })
    )
  )
