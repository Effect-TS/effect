import { Schema } from "effect"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcGroup from "effect/unstable/rpc/RpcGroup"
import * as RpcServer from "effect/unstable/rpc/RpcServer"
import { describe, it } from "tstyche"

const Ping = Rpc.make("Ping", { success: Schema.String })
const Group = RpcGroup.make(Ping)

describe("RpcServer", () => {
  it("layerHttp accepts disableFatalDefects", () => {
    RpcServer.layerHttp({
      group: Group,
      path: "/rpc",
      disableFatalDefects: true
    })
  })

  it("HTTP server options accept streamBufferSize", () => {
    RpcServer.layerHttp({
      group: Group,
      path: "/rpc",
      protocol: "http",
      streamBufferSize: 16
    })
    RpcServer.layerProtocolHttp({ path: "/rpc", streamBufferSize: 16 })
    void RpcServer.makeProtocolHttp({ path: "/rpc", streamBufferSize: 16 })
    void RpcServer.makeProtocolWithHttpEffect({ streamBufferSize: 16 })
    void RpcServer.toHttpEffect(Group, { streamBufferSize: 16 })

    RpcServer.layerHttp({
      group: Group,
      path: "/rpc",
      protocol: "http",
      streamBufferSize: "unbounded"
    })
    RpcServer.layerProtocolHttp({ path: "/rpc", streamBufferSize: "unbounded" })
    void RpcServer.makeProtocolHttp({ path: "/rpc", streamBufferSize: "unbounded" })
    void RpcServer.makeProtocolWithHttpEffect({ streamBufferSize: "unbounded" })
    void RpcServer.toHttpEffect(Group, { streamBufferSize: "unbounded" })
  })

  it("toHttpEffect accepts disableFatalDefects", () => {
    void RpcServer.toHttpEffect(Group, { disableFatalDefects: true })
  })

  it("toHttpEffectWebsocket accepts disableFatalDefects", () => {
    void RpcServer.toHttpEffectWebsocket(Group, { disableFatalDefects: true })
  })
})
