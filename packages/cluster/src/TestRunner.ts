/**
 * @since 1.0.0
 */
import * as Layer from "effect/Layer"
import * as MessageStorage from "./MessageStorage.js"
import * as RunnerHealth from "./RunnerHealth.js"
import * as Runners from "./Runners.js"
import * as RunnerStorage from "./RunnerStorage.js"
import * as Sharding from "./Sharding.js"
import * as ShardingConfig from "./ShardingConfig.js"

/**
 * An in-memory cluster that can be used for testing purposes.
 *
 * MessageStorage is backed by an in-memory driver, and RunnerStorage is backed
 * by an in-memory driver.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  Sharding.Sharding | Runners.Runners | MessageStorage.MessageStorage | MessageStorage.MemoryDriver
> = Sharding.layer.pipe(
  Layer.provideMerge(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop]),
  Layer.provide(ShardingConfig.layer())
)
