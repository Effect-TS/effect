/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform/IndexedDb"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface IndexedDb {
  readonly [TypeId]: TypeId
  readonly indexedDB: globalThis.IDBFactory
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
}

/**
 * @since 1.0.0
 * @category tag
 */
export const IndexedDb: Context.Tag<IndexedDb, IndexedDb> = Context.GenericTag<IndexedDb>(
  "@effect/platform/IndexedDb"
)

/**
 * @since 1.0.0
 * @category constructor
 */
export const make = (impl: Omit<IndexedDb, TypeId>): IndexedDb => IndexedDb.of({ ...impl, [TypeId]: TypeId })
