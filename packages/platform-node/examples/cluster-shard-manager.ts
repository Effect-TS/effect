import { ShardStorage } from "@effect/cluster"
import { NodeClusterShardManagerSocket, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"

NodeClusterShardManagerSocket.layer().pipe(
  Layer.provide(ShardStorage.layerMemory),
  // Layer.provide(Logger.minimumLogLevel(LogLevel.All)),
  Layer.launch,
  NodeRuntime.runMain
)
