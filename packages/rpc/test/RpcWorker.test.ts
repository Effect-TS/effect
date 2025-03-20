// @vitest-environment happy-dom
import "@vitest/web-worker"

import * as BrowserWorker from "@effect/platform-browser/BrowserWorker"
import { RpcServer } from "@effect/rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import { describe } from "@effect/vitest"
import { Layer } from "effect"
import { e2eSuite } from "./e2e.js"
import { UsersClient } from "./fixtures/schemas.js"

describe("RpcWorker", () => {
  const WorkerClient = UsersClient.layer.pipe(
    Layer.provide(RpcClient.layerProtocolWorker({ size: 1 })),
    Layer.provide(BrowserWorker.layerPlatform(() => new Worker(new URL("./fixtures/worker.ts", import.meta.url)))),
    Layer.merge(Layer.succeed(RpcServer.Protocol, {
      supportsAck: true
    } as any))
  )
  e2eSuite("e2e worker", WorkerClient, false)
})
