import { ShardStorage } from "@effect/cluster"
import { NodeClusterSocketShardManager, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"

NodeClusterSocketShardManager.layer().pipe(
  Layer.provide(ShardStorage.layerMemory),
  // Layer.provide(Logger.minimumLogLevel(LogLevel.All)),
  Layer.launch,
  NodeRuntime.runMain
)
