/**
 * @since 1.0.0
 */
import * as IndexedDb from "@effect/platform/IndexedDb"
import { Cause, ConfigError, Layer } from "effect"
import * as Effect from "effect/Effect"

/**
 * Instance of IndexedDb from the `window` object.
 *
 * @since 1.0.0
 * @category constructors
 */
export const layerWindow: Layer.Layer<IndexedDb.IndexedDb, ConfigError.ConfigError> = Layer.effect(
  IndexedDb.IndexedDb,
  Effect.fromNullable(window).pipe(
    Effect.flatMap((window) =>
      Effect.all({
        indexedDB: Effect.fromNullable(window.indexedDB),
        IDBKeyRange: Effect.fromNullable(window.IDBKeyRange)
      })
    ),
    Effect.map(({ IDBKeyRange, indexedDB }) => IndexedDb.make({ indexedDB, IDBKeyRange })),
    Effect.mapError((cause) =>
      ConfigError.SourceUnavailable(
        ["window"],
        "window.indexedDB is not available",
        Cause.fail(cause)
      )
    )
  )
)
