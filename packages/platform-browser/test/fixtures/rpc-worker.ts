import { BrowserWorkerRunner } from "@effect/platform-browser"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { RpcLive } from "./rpc-schemas.js"

const MainLive = RpcLive.pipe(
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(BrowserWorkerRunner.layer)
)

Effect.runFork(BrowserWorkerRunner.launch(MainLive))
