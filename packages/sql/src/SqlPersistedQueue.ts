/**
 * @since 1.0.0
 */
import * as PersistedQueue from "@effect/experimental/PersistedQueue"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as SqlClient from "./SqlClient.js"
import type { SqlError } from "./SqlError.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options?: {}): Effect.Effect<
  PersistedQueue.PersistedQueueStore["Type"],
  never,
  SqlClient.SqlClient
> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerStore = (options?: {}): Layer.Layer<
  PersistedQueue.PersistedQueueStore,
  never,
  SqlClient.SqlClient
> => Layer.effect(PersistedQueue.PersistedQueueStore, make(options))
