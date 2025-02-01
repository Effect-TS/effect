import * as NodeSocketServer from "@effect/experimental/SocketServer/Node"
import { HttpClient, HttpClientRequest, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeSocket } from "@effect/platform-node"
import { RpcClient, RpcSerialization, RpcServer } from "@effect/rpc"
import { describe } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { e2eSuite } from "./e2e.js"
import { RpcLive, UsersClient } from "./fixtures/schemas.js"

describe("RpcServer", () => {
  // http ndjson
  const HttpNdjsonServer = HttpRouter.Default.serve().pipe(
    Layer.provide(RpcLive),
    Layer.provide(RpcServer.layerProtocolHttp({ path: "/rpc" }))
  )
  const HttpNdjsonClient = UsersClient.layer.pipe(
    Layer.provide(
      RpcClient.layerProtocolHttp({
        url: "",
        transformClient: HttpClient.mapRequest(HttpClientRequest.appendUrl("/rpc"))
      })
    )
  )
  e2eSuite(
    "e2e http ndjson",
    HttpNdjsonClient.pipe(
      Layer.provide(HttpNdjsonServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerNdjson])
    )
  )
  e2eSuite(
    "e2e http msgpack",
    HttpNdjsonClient.pipe(
      Layer.provide(HttpNdjsonServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerMsgPack])
    )
  )

  // websocket
  const HttpWsServer = HttpRouter.Default.serve().pipe(
    Layer.provide(RpcLive),
    Layer.provide(RpcServer.layerProtocolWebsocket({ path: "/rpc" }))
  )
  const HttpWsClient = UsersClient.layer.pipe(
    Layer.provide(RpcClient.layerProtocolSocket),
    Layer.provide(
      Effect.gen(function*() {
        const server = yield* HttpServer.HttpServer
        const address = server.address as HttpServer.TcpAddress
        return NodeSocket.layerWebSocket(`http://127.0.0.1:${address.port}/rpc`)
      }).pipe(Layer.unwrapEffect)
    )
  )
  e2eSuite(
    "e2e ws ndjson",
    HttpWsClient.pipe(
      Layer.provide(HttpWsServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerNdjson])
    )
  )
  e2eSuite(
    "e2e ws json",
    HttpWsClient.pipe(
      Layer.provide(HttpWsServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerJson])
    )
  )
  e2eSuite(
    "e2e ws msgpack",
    HttpWsClient.pipe(
      Layer.provide(HttpWsServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerMsgPack])
    )
  )

  // tcp
  const TcpServer = RpcLive.pipe(
    Layer.provide(RpcServer.layerProtocolSocketServer),
    Layer.provideMerge(NodeSocketServer.layer({ port: 0 }))
  )
  const TcpClient = UsersClient.layer.pipe(
    Layer.provide(RpcClient.layerProtocolSocket),
    Layer.provide(
      Effect.gen(function*() {
        const server = yield* NodeSocketServer.SocketServer
        const address = server.address as NodeSocketServer.TcpAddress
        return NodeSocket.layerNet({ port: address.port })
      }).pipe(Layer.unwrapEffect)
    )
  )
  e2eSuite(
    "e2e tcp ndjson",
    TcpClient.pipe(
      Layer.provide(TcpServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerNdjson])
    )
  )
  e2eSuite(
    "e2e tcp msgpack",
    TcpClient.pipe(
      Layer.provide(TcpServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerMsgPack])
    )
  )
})
