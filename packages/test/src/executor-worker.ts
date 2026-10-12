// Entry point of a worker-thread executor: serves ExecutorRpcs over
// the worker-runner protocol. Swapping this transport layer (socket, stdio) is
// all it would take to make the executor a child process or a remote machine.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import * as Layer from "effect/Layer"
import * as RpcServer from "effect/rpc/RpcServer"
import { ExecutorState, listFile, runFile } from "./Executor.ts"
import { ExecutorRpcs } from "./Protocol.ts"

const Handlers = ExecutorRpcs.toLayer({
  ListFile: ({ path }) => listFile(path),
  RunFile: ({ concurrency, path, tests }) => runFile(path, concurrency, tests)
})

const Main = RpcServer.layer(ExecutorRpcs).pipe(
  Layer.provide(Handlers),
  Layer.provide(ExecutorState.layer),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(NodeWorkerRunner.layer)
)

NodeRuntime.runMain(Layer.launch(Main))
