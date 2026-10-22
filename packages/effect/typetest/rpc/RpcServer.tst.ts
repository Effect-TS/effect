import { type Effect, hole, Schema } from "effect"
import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"
import type * as RpcMessage from "effect/rpc/RpcMessage"
import * as RpcServer from "effect/rpc/RpcServer"
import { describe, expect, it } from "tstyche"

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

  it("toHttpEffect accepts disableFatalDefects", () => {
    void RpcServer.toHttpEffect(Group, { disableFatalDefects: true })
  })

  it("toHttpEffectWebsocket accepts disableFatalDefects", () => {
    void RpcServer.toHttpEffectWebsocket(Group, { disableFatalDefects: true })
  })
})

describe("RpcServer.Protocol", () => {
  it("accepts a send implementation typed with DOM transferables", () => {
    const send = hole<
      (
        clientId: number,
        response: RpcMessage.FromServerEncoded,
        transferables?: ReadonlyArray<globalThis.Transferable>
      ) => Effect.Effect<void>
    >()

    expect(send).type.toBeAssignableTo<RpcServer.Protocol["Service"]["send"]>()
  })
})
