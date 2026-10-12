// Entry point of an executor: serves ExecutorRpcs over the worker-runner protocol of
// whichever runtime it runs on. Swapping this transport layer (socket, stdio) is all it
// would take to make the executor a child process or a remote machine.
import * as Layer from "effect/Layer"
import * as RpcServer from "effect/rpc/RpcServer"
import { ExecutorState, listFile, runFile } from "./Executor.ts"
import * as Platform from "./Platform.ts"
import { ExecutorRpcs } from "./Protocol.ts"

const Handlers = ExecutorRpcs.toLayer({
  ListFile: ({ path }) => listFile(path),
  RunFile: ({ concurrency, config, path, tests }) => runFile(path, config, concurrency, tests)
})

const Main = RpcServer.layer(ExecutorRpcs).pipe(
  Layer.provide(Handlers),
  Layer.provide(ExecutorState.layer),
  Layer.provide(RpcServer.layerProtocolWorkerRunner)
)

Platform.runMain((platform) => Layer.launch(Main.pipe(Layer.provide(platform.workerRunner))))
