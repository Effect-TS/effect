import type { SQL } from "drizzle-orm"
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { SqlClient } from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import type { Statement } from "effect/sql/Statement"

/** Only installed driver handles are erased; domain values keep their schemas. */
export interface NativePhysicalDatabase {
  readonly $client: SqlClient & {
    readonly batch: (
      statements: ReadonlyArray<Statement<unknown>>
    ) => Effect.Effect<unknown, SqlError>
  }
  readonly transaction: <A, E, R>(
    body: (transaction: NativeDatabaseHandle) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | SqlError, R>
}

/** The captured native Drizzle owner; never a shared/raw SQL resource. */
export class NativeDatabase extends Context.Service<NativeDatabase, NativePhysicalDatabase>()(
  "@effect/auth-persistence-drizzle/NativeDatabase"
) {}

export type NativeDatabaseHandle = NativeSqlDatabase & NativePhysicalDatabase

/* oxlint-disable no-explicit-any -- only native query-builder handles are erased; domain values use mapped codecs. */
export interface NativeSqlQuery<A = ReadonlyArray<any>> extends
  Effect.Effect<
    A,
    EffectDrizzleQueryError | SqlError
  >
{
  readonly getSQL: () => SQL
  readonly toSQL: () => { readonly sql: string; readonly params: ReadonlyArray<unknown> }
  readonly from: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly where: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly limit: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly orderBy: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly for: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly set: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly values: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly returning: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly $returningId: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly innerJoin: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly onConflictDoNothing: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
  readonly onDuplicateKeyUpdate: (...args: ReadonlyArray<any>) => NativeSqlQuery<A>
}

export interface NativeSqlDatabase {
  readonly select: (...args: ReadonlyArray<any>) => NativeSqlQuery
  readonly insert: (...args: ReadonlyArray<any>) => NativeSqlQuery
  readonly update: (...args: ReadonlyArray<any>) => NativeSqlQuery
  readonly delete: (...args: ReadonlyArray<any>) => NativeSqlQuery
  readonly transaction: <A, E, R>(
    body: (transaction: NativeSqlDatabase) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | SqlError, R>
}

/**
 * Driver makers supply actual query objects and their captured native client.
 * Drizzle class declarations omit that client and D1's batch method.
 *
 * @internal
 */
export const nativeDatabase = <Database, E, R>(acquire: Effect.Effect<Database, E, R>) =>
  Effect.map(
    acquire,
    (database) => database as unknown as Database & NativePhysicalDatabase & NativeSqlDatabase
  )
