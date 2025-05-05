/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as ConfigError from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDb"
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
  "@effect/platform-browser/IndexedDb"
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
export const layerWindow: Layer.Layer<IndexedDb, ConfigError.ConfigError> = Layer.effect(
  IndexedDb,
  Effect.fromNullable(window).pipe(
    Effect.flatMap((window) =>
      Effect.all({
        indexedDB: Effect.fromNullable(window.indexedDB),
        IDBKeyRange: Effect.fromNullable(window.IDBKeyRange)
      })
    ),
    Effect.map(({ IDBKeyRange, indexedDB }) => make({ indexedDB, IDBKeyRange })),
    Effect.mapError((cause) =>
      ConfigError.SourceUnavailable(
        ["window"],
        "window.indexedDB is not available",
        Cause.fail(cause)
      )
    )
  )
)
