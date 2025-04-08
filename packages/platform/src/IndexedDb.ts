/**
 * @since 1.0.0
 */
import { Cause, ConfigError, Layer } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"

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

/**
 * Instance of IndexedDb from the `window` object.
 *
 * @since 1.0.0
 * @category constructors
 */
export const layerWindow = Layer.effect(
  IndexedDb,
  Effect.fromNullable(window?.indexedDB).pipe(
    Effect.map((indexedDB) => make({ indexedDB })),
    Effect.mapError((cause) =>
      ConfigError.SourceUnavailable(
        ["window"],
        "window.indexedDB is not available",
        Cause.fail(cause)
      )
    )
  )
)
