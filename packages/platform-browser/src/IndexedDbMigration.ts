/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import { type Pipeable } from "effect/Pipeable"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"
import * as internal from "./internal/indexedDbMigration.js"

type IsStringLiteral<T> = T extends string ? string extends T ? false
  : true
  : false

/** @internal */
export type IndexFromTable<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDbVersion.IndexedDbVersion.Tables<Source>
  >
> = IsStringLiteral<
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
  export interface Initial<
    in out InitialVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    in out Error = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
    readonly _tag: "Initial"
    readonly version: InitialVersion
    readonly execute: (toQuery: internal.MigrationApi<InitialVersion>) => Effect.Effect<void, Error>

    readonly add: <
      Version extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
      MigrationError
    >(
      version: Version,
      execute: (
        fromQuery: internal.MigrationApi<InitialVersion>,
        toQuery: internal.MigrationApi<Version>
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
      fromQuery: internal.MigrationApi<FromVersion>,
      toQuery: internal.MigrationApi<ToVersion>
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
