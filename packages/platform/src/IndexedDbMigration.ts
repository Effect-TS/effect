/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import { type Pipeable } from "effect/Pipeable"
import type * as IndexedDbQuery from "./IndexedDbQuery.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"
import * as internal from "./internal/indexedDbMigration.js"

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
export const IndexedDbMigrationError = internal.IndexedDbMigrationError

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbMigration {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Transaction<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
  > extends Pipeable, Omit<IndexedDbQuery.IndexedDbQuery<Source>, "transaction"> {
    readonly transaction: globalThis.IDBTransaction

    readonly createObjectStore: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(table: A) => Effect.Effect<globalThis.IDBObjectStore, internal.IndexedDbMigrationError>

    readonly deleteObjectStore: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(table: A) => Effect.Effect<void, internal.IndexedDbMigrationError>

    readonly createIndex: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(
      table: A,
      indexName: internal.IndexFromTable<Source, A>,
      options?: IDBIndexParameters
    ) => Effect.Effect<globalThis.IDBIndex, internal.IndexedDbMigrationError>

    readonly deleteIndex: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(
      table: A,
      indexName: internal.IndexFromTable<Source, A>
    ) => Effect.Effect<void, internal.IndexedDbMigrationError>
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
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
    readonly _tag: "Initial" | "Migration"
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
export const make = internal.makeInitialProto
