/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as ConfigError from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

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
  Effect.suspend(() => {
    if (window.indexedDB && window.IDBKeyRange) {
      return Effect.succeed(make({
        indexedDB: window.indexedDB,
        IDBKeyRange: window.IDBKeyRange
      }))
    } else {
      return Effect.fail(
        ConfigError.SourceUnavailable(
          ["window"],
          "window.indexedDB is not available",
          Cause.fail(new Error("window.indexedDB is not available"))
        )
      )
    }
  })
)

/**
 * Schema for `autoIncrement` key path (`number`).
 *
 * @since 1.0.0
 * @category schemas
 */
export const AutoIncrement = Schema.Number
  .annotations(
    {
      identifier: "AutoIncrement",
      title: "autoIncrement",
      description: "Defines a valid autoIncrement key path for the IndexedDb table"
    }
  )
