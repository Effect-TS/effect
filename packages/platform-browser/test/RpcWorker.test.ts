import "@vitest/web-worker"

import * as BrowserWorker from "@effect/platform-browser/BrowserWorker"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcServer from "@effect/rpc/RpcServer"
import { describe } from "@effect/vitest"
import { Layer } from "effect"
import { UsersClient } from "./fixtures/rpc-schemas.js"
import { e2eSuite } from "./rpc-e2e.js"

describe("RpcWorker", () => {
  const WorkerClient = UsersClient.layer.pipe(
    Layer.provide(RpcClient.layerProtocolWorker({ size: 1 })),
    Layer.provide(BrowserWorker.layerPlatform(() => new Worker(new URL("./fixtures/rpc-worker.ts", import.meta.url)))),
    Layer.merge(Layer.succeed(RpcServer.Protocol, {
      supportsAck: true
    } as any))
  )
  e2eSuite("e2e worker", WorkerClient, false)
})
