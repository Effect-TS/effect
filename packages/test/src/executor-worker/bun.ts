// An executor on Bun: a Bun worker, started by the CLI's Bun platform (cli/platform/bun.ts).
// It always runs on the same runtime as the CLI that spawned it, so nothing is detected.
// The executor itself is transport-independent; this is where it gets the worker protocol.
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunWorkerRunner from "@effect/platform-bun/BunWorkerRunner"
import * as Layer from "effect/Layer"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Executor from "../Executor.ts"

Executor.layer.pipe(
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(BunWorkerRunner.layer),
  Layer.launch,
  BunRuntime.runMain
)
