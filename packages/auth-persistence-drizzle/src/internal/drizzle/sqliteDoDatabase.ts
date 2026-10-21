import { PersistenceConfigurationError } from "@effect/auth-persistence/Adapter"
import type { SqliteClient } from "@effect/sql-sqlite-do/SqliteClient"
import type { AnyRelations } from "drizzle-orm"
import { EffectTransactionRollbackError } from "drizzle-orm/effect-core"
import type { EffectSQLiteDoDatabase } from "drizzle-orm/effect-sqlite-do"
import * as Effect from "effect/Effect"
import type { SqlError } from "effect/sql/SqlError"

type NativeDatabase<T extends AnyRelations> = EffectSQLiteDoDatabase<T> & {
  readonly $client: SqliteClient
}

type Queries<T extends AnyRelations> = Pick<
  NativeDatabase<T>,
  | "query"
  | "$cache"
  | "$with"
  | "$count"
  | "with"
  | "select"
  | "selectDistinct"
  | "insert"
  | "update"
  | "delete"
  | "run"
  | "all"
  | "get"
  | "values"
>

/** Drizzle queries with transactions owned by the captured Effect SQL client. */
export type DatabaseValue<T extends AnyRelations = AnyRelations> = Queries<T> & {
  readonly $client: SqliteClient
  readonly transaction: <A, E, R>(
    body: (transaction: Transaction<T>) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | SqlError, R>
}

/** An asynchronous Durable Object transaction, including nested rollback. */
export type Transaction<T extends AnyRelations = AnyRelations> = DatabaseValue<T> & {
  readonly rollback: () => EffectTransactionRollbackError
}

/**
 * Construct a query handle inside an existing asynchronous SQL owner.
 *
 * @internal
 */
export const makeTransactionHandle = <T extends AnyRelations>(
  database: DatabaseValue<T>
): Transaction<T> => ({
  ...database,
  rollback: () => EffectTransactionRollbackError.make({})
})

/**
 * Keep the application's Drizzle query configuration and capture its SQL client.
 * Effect SQL owns storage.transaction, so cryptography may suspend before commit.
 * Raw Drizzle transactionSync callbacks are not supported outer owners.
 */
export const makeDatabase = Effect.fnUntraced(function*<T extends AnyRelations>(
  database: NativeDatabase<T>
): Effect.fn.Return<DatabaseValue<T>, PersistenceConfigurationError> {
  const client = database.$client

  if (client.config.storage === undefined) {
    return yield* PersistenceConfigurationError.make({
      reason: "SqliteDo requires a SQL client configured with Durable Object storage"
    })
  }

  const queries: Queries<T> = {
    query: database.query,
    $cache: database.$cache,
    $with: database.$with.bind(database),
    $count: database.$count.bind(database),
    with: database.with.bind(database),
    select: database.select.bind(database),
    selectDistinct: database.selectDistinct.bind(database),
    insert: database.insert.bind(database),
    update: database.update.bind(database),
    delete: database.delete.bind(database),
    run: database.run.bind(database),
    all: database.all.bind(database),
    get: database.get.bind(database),
    values: database.values.bind(database)
  }

  const transaction: DatabaseValue<T>["transaction"] = (body) =>
    client.withTransaction(Effect.suspend(() => body(makeTransaction())))

  const makeTransaction = (): Transaction<T> => ({
    ...queries,
    $client: client,
    transaction,
    rollback: () => EffectTransactionRollbackError.make({})
  })

  return { ...queries, $client: client, transaction }
})
