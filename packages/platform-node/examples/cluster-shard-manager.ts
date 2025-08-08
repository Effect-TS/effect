import { NodeClusterShardManagerSocket, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"

NodeClusterShardManagerSocket.layer().pipe(
  Layer.launch,
  NodeRuntime.runMain
)
