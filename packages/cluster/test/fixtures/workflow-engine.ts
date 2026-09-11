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

// Cluster engine over the caller's MessageStorage, so tests can inspect it.
export const makeEngine = (config: Config) =>
  ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(Runners.layerNoop),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(ShardingConfig.layer(config))
  )

export const makeMemoryEngine = (config: Config) =>
  makeEngine(config).pipe(
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(ShardingConfig.layer(config))
  )
