import { NodeRuntime, NodeWorkerRunner } from "@effect/platform-node"
import { RpcServer } from "@effect/rpc"
import { Layer } from "effect"
import { RpcLive } from "./rpc-schemas.js"

RpcLive.pipe(
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(NodeWorkerRunner.layer),
  Layer.launch,
  NodeRuntime.runMain
)
