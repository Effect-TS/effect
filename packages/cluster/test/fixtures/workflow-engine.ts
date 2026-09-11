import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Layer } from "effect"

type Config = Partial<ShardingConfig.ShardingConfig["Type"]>

const make = (config: Layer.Layer<ShardingConfig.ShardingConfig>) =>
  ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(Runners.layerNoop),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(config)
  )

// Cluster engine over the caller's MessageStorage, so tests can inspect it.
export const makeEngine = (config: Config) => make(ShardingConfig.layer(config))

export const makeMemoryEngine = (config: Config) => {
  const configLayer = ShardingConfig.layer(config)
  return make(configLayer).pipe(
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(configLayer)
  )
}
