/**
 * @since 1.0.0
 */
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Socket from "@effect/platform/Socket"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { RpcClientProtocol } from "./Runners.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocolHttp = (options: {
  readonly path: string
  readonly https?: boolean | undefined
}): Layer.Layer<
  RpcClientProtocol,
  never,
  RpcSerialization.RpcSerialization | HttpClient.HttpClient
> =>
  Layer.effect(
    RpcClientProtocol,
    Effect.gen(function*() {
      const serialization = yield* RpcSerialization.RpcSerialization
      const client = yield* HttpClient.HttpClient
      const https = options.https ?? false
      return (address) => {
        const clientWithUrl = HttpClient.mapRequest(
          client,
          HttpClientRequest.prependUrl(`http${https ? "s" : ""}://${address.host}:${address.port}/${options.path}`)
        )
        return RpcClient.makeProtocolHttp(clientWithUrl).pipe(
          Effect.provideService(RpcSerialization.RpcSerialization, serialization)
        )
      }
    })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocolWebsocket = (options: {
  readonly path: string
  readonly https?: boolean | undefined
}): Layer.Layer<
  RpcClientProtocol,
  never,
  RpcSerialization.RpcSerialization | Socket.WebSocketConstructor
> =>
  Layer.effect(
    RpcClientProtocol,
    Effect.gen(function*() {
      const serialization = yield* RpcSerialization.RpcSerialization
      const https = options.https ?? false
      const constructor = yield* Socket.WebSocketConstructor
      return Effect.fnUntraced(function*(address) {
        const socket = yield* Socket.makeWebSocket(
          `ws${https ? "s" : ""}://${address.host}:${address.port}/${options.path}`
        ).pipe(
          Effect.provideService(Socket.WebSocketConstructor, constructor)
        )
        return yield* RpcClient.makeProtocolSocket.pipe(
          Effect.provideService(Socket.Socket, socket),
          Effect.provideService(RpcSerialization.RpcSerialization, serialization)
        )
      })
    })
  )
