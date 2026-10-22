import { type Effect, hole, Schema } from "effect"
import { Rpc, type RpcClient, type RpcClientError, type RpcMessage } from "effect/rpc"
import { describe, expect, it } from "tstyche"

const A = Rpc.make("A", { payload: { id: Schema.String }, success: Schema.Number })
const B = Rpc.make("B", { success: Schema.String })

describe("RpcClient.Flat", () => {
  it("infers a result per RPC for a union of tags", () => {
    const client = hole<RpcClient.RpcClient.Flat<typeof A | typeof B>>()

    expect(client(hole<"A" | "B">(), hole<{ readonly id: string } | void>())).type.toBe<
      Effect.Effect<number> | Effect.Effect<string>
    >()
  })
})

describe("RpcClient.Protocol", () => {
  it("accepts a send implementation typed with DOM transferables", () => {
    const send = hole<
      (
        clientId: number,
        request: RpcMessage.FromClientEncoded,
        transferables?: ReadonlyArray<globalThis.Transferable>
      ) => Effect.Effect<void, RpcClientError.RpcClientError>
    >()

    expect(send).type.toBeAssignableTo<RpcClient.Protocol["Service"]["send"]>()
  })
})
