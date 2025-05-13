/**
 * @since 1.0.0
 */
import type { YieldableError } from "effect/Cause"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import { type Pipeable } from "effect/Pipeable"
import type * as IndexedDb from "./IndexedDb.js"
import type * as IndexedDbQueryBuilder from "./IndexedDbQueryBuilder.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"
import * as internal from "./internal/indexedDbDatabase.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = internal.ErrorTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorReason = {
  readonly _tag: "TransactionError"
  readonly cause: unknown
} | {
  readonly _tag: "MissingTable"
  readonly cause: unknown
} | {
  readonly _tag: "OpenError"
  readonly cause: unknown
} | {
  readonly _tag: "UpgradeError"
  readonly cause: unknown
} | {
  readonly _tag: "Aborted"
  readonly cause: unknown
} | {
  readonly _tag: "Blocked"
  readonly cause: unknown
} | {
  readonly _tag: "MissingIndex"
  readonly cause: unknown
} | {
  readonly _tag: "TransactionError"
  readonly cause: unknown
}

/**
 * @since 1.0.0
 * @category errors
 */
export interface IndexedDbDatabaseError extends YieldableError {
  readonly [ErrorTypeId]: IndexedDbDatabaseError
  readonly _tag: "IndexedDbDatabaseError"
  readonly reason: ErrorReason
}

/**
 * @since 1.0.0
 * @category models
 */
export interface IndexedDbMigration {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbDatabase {
  /**
   * @since 1.0.0
   * @category models
   */
  export type IndexFromTable<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  > = internal.IsStringLiteral<
    Extract<
      keyof IndexedDbTable.IndexedDbTable.Indexes<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >,
      string
    >
  > extends true ? Extract<
      keyof IndexedDbTable.IndexedDbTable.Indexes<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >,
      string
    > :
    never

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Transaction<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
  > extends Pipeable, Omit<IndexedDbQueryBuilder.IndexedDbQueryBuilder<Source>, "transaction"> {
    readonly transaction: globalThis.IDBTransaction

    readonly createObjectStore: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(table: A) => Effect.Effect<globalThis.IDBObjectStore, IndexedDbDatabaseError>

    readonly deleteObjectStore: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(table: A) => Effect.Effect<void, IndexedDbDatabaseError>

    readonly createIndex: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(
      table: A,
      indexName: IndexFromTable<Source, A>,
      options?: IDBIndexParameters
    ) => Effect.Effect<globalThis.IDBIndex, IndexedDbDatabaseError>

    readonly deleteIndex: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(
      table: A,
      indexName: IndexFromTable<Source, A>
    ) => Effect.Effect<void, IndexedDbDatabaseError>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Initial<
    in out InitialVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    in out Error = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
    readonly _tag: "Initial"
    readonly version: InitialVersion
    readonly execute: (toQuery: Transaction<InitialVersion>) => Effect.Effect<void, Error>

    readonly add: <
      Version extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
      MigrationError
    >(
      version: Version,
      execute: (
        fromQuery: Transaction<InitialVersion>,
        toQuery: Transaction<Version>
      ) => Effect.Effect<void, MigrationError>
    ) => Migration<InitialVersion, Version, MigrationError | Error>

    readonly getQueryBuilder: Effect.Effect<
      IndexedDbQueryBuilder.IndexedDbQueryBuilder<InitialVersion>,
      never,
      IndexedDbMigration
    >

    readonly layer: <DatabaseName extends string>(
      databaseName: DatabaseName
    ) => Layer.Layer<IndexedDbMigration, IndexedDbDatabaseError, IndexedDb.IndexedDb>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Migration<
    in out FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    in out ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    out Error = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
    readonly _tag: "Migration"
    readonly previous: Migration<FromVersion, ToVersion, Error> | Initial<FromVersion, Error>
    readonly fromVersion: FromVersion
    readonly toVersion: ToVersion
    readonly execute: (
      fromQuery: Transaction<FromVersion>,
      toQuery: Transaction<ToVersion>
    ) => Effect.Effect<void, Error>

    readonly getQueryBuilder: Effect.Effect<
      IndexedDbQueryBuilder.IndexedDbQueryBuilder<ToVersion>,
      never,
      IndexedDbMigration
    >

    readonly layer: <DatabaseName extends string>(
      databaseName: DatabaseName
    ) => Layer.Layer<IndexedDbMigration, IndexedDbDatabaseError, IndexedDb.IndexedDb>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
    readonly _tag: "Initial" | "Migration"
    readonly layer: <DatabaseName extends string>(
      databaseName: DatabaseName
    ) => Layer.Layer<IndexedDbMigration, IndexedDbDatabaseError, IndexedDb.IndexedDb>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyMigration = Migration<
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    any
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyInitial = Initial<IndexedDbVersion.IndexedDbVersion.AnyWithProps, any>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <
  InitialVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Error
>(
  initialVersion: InitialVersion,
  init: (toQuery: IndexedDbDatabase.Transaction<InitialVersion>) => Effect.Effect<void, Error>
) => IndexedDbDatabase.Initial<InitialVersion, Error> = internal.makeInitialProto
