// An executor on Node: a worker thread, started by the CLI's Node platform (../platform/node.ts).
// It always runs on the same runtime as the CLI that spawned it, so nothing is detected.
// The executor itself is transport-independent; this is where it gets the worker protocol.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import * as Layer from "effect/Layer"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Executor from "../../Executor.ts"

Executor.layer.pipe(
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(NodeWorkerRunner.layer),
  Layer.launch,
  NodeRuntime.runMain
)
