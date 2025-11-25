/**
 * @since 1.0.0
 */
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PersistedQueue from "../PersistedQueue.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(
  options: {
    readonly prefix?: string | undefined
  }
) {
  return PersistedQueue.PersistedQueueStore.of({})
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerStore = (options: { readonly prefix?: string | undefined }) =>
  Layer.scoped(PersistedQueue.PersistedQueueStore, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerStoreConfig = (
  options: Config.Config.Wrap<{ readonly prefix?: string | undefined }>
) => Layer.scoped(PersistedQueue.PersistedQueueStore, Effect.flatMap(Config.unwrap(options), make))
