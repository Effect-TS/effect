import { OpenRpc, Rpc, RpcGroup } from "effect/rpc"
import { describe, expect, it } from "tstyche"

describe("OpenRpc", () => {
  it("requires names for supplied servers", () => {
    const group = RpcGroup.make(Rpc.make("ping"))
    const info = { title: "Health API", version: "1.0.0" }

    expect(OpenRpc.fromRpcGroup).type.toBeCallableWith(group, { info })
    expect(OpenRpc.fromRpcGroup).type.toBeCallableWith(group, {
      info,
      servers: [{ name: "production", url: "https://example.com/rpc" }]
    })
    expect(OpenRpc.fromRpcGroup).type.not.toBeCallableWith(group, {
      info,
      servers: [{ url: "https://example.com/rpc" }]
    })
  })
})
