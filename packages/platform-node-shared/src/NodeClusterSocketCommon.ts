/**
 * @since 1.0.0
 */
import * as Runners from "@effect/cluster/Runners"
import { Socket } from "@effect/platform/Socket"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodeSocket from "./NodeSocket.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerClientProtocol: Layer.Layer<
  Runners.RpcClientProtocol,
  never,
  RpcSerialization.RpcSerialization
> = Layer.effect(
  Runners.RpcClientProtocol,
  Effect.gen(function*() {
    const serialization = yield* RpcSerialization.RpcSerialization
    return Effect.fnUntraced(function*(address) {
      const socket = yield* NodeSocket.makeNet({
        host: address.host,
        port: address.port
      })
      return yield* RpcClient.makeProtocolSocket.pipe(
        Effect.provideService(Socket, socket),
        Effect.provideService(RpcSerialization.RpcSerialization, serialization)
      )
    }, Effect.orDie)
  })
)
