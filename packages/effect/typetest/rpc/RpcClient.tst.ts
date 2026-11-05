import { type Cause, type Effect, hole, type Queue, Schema, type Scope, type Stream } from "effect"
import { Rpc, type RpcClient } from "effect/rpc"
import { describe, expect, it } from "tstyche"

const A = Rpc.make("A", { payload: { id: Schema.String }, success: Schema.Number })
const B = Rpc.make("B", { success: Schema.String })
const Fails = Rpc.make("Fails", { success: Schema.Number, error: Schema.String })
const Events = Rpc.make("Events", { success: Schema.String, error: Schema.Number, stream: true })

describe("RpcClient.Flat", () => {
  const client = hole<RpcClient.RpcClient.Flat<typeof A | typeof B | typeof Fails | typeof Events>>()

  it("infers a result per RPC for a union of tags", () => {
    const client = hole<RpcClient.RpcClient.Flat<typeof A | typeof B>>()

    expect(client(hole<"A" | "B">(), hole<{ readonly id: string } | void>())).type.toBe<
      Effect.Effect<number> | Effect.Effect<string>
    >()
  })

  it("returns a stream, or a dequeue ended with Cause.Done when asQueue is set", () => {
    expect(client("Events", undefined)).type.toBe<Stream.Stream<string, number>>()
    expect(client("Events", undefined, { asQueue: true })).type.toBe<
      Effect.Effect<Queue.Dequeue<string, number | Cause.Done>, never, Scope.Scope>
    >()
  })

  it("drops the result and RPC error when discard is set", () => {
    expect(client("Fails", undefined, { discard: true })).type.toBe<Effect.Effect<void>>()
  })

  it("rejects unknown tags and payloads of other RPCs", () => {
    expect(client).type.not.toBeCallableWith("Missing", undefined)
    expect(client).type.not.toBeCallableWith("A", undefined)
  })
})
