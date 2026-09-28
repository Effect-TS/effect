import { Context, Effect, hole, Schema, SchemaGetter, type Stream } from "effect"
import { Rpc, type RpcClient } from "effect/rpc"
import { describe, expect, it } from "tstyche"

class ScaleA extends Context.Service<ScaleA, number>()("ScaleA") {}
class ScaleB extends Context.Service<ScaleB, number>()("ScaleB") {}

const ScaledA = Schema.Number.pipe(Schema.decode({
  decode: SchemaGetter.transformEffect((n: number) => Effect.map(ScaleA, (scale) => n * scale)),
  encode: SchemaGetter.passthrough()
}))
const ScaledB = Schema.Number.pipe(Schema.decode({
  decode: SchemaGetter.transformEffect((n: number) => Effect.map(ScaleB, (scale) => n * scale)),
  encode: SchemaGetter.passthrough()
}))

const GetA = Rpc.make("GetA", {
  payload: { id: Schema.String },
  success: Schema.Struct({ a: ScaledA }),
  error: Schema.TaggedStruct("ErrorA", {})
})
const GetB = Rpc.make("GetB", {
  payload: { count: Schema.Number },
  success: Schema.Struct({ b: ScaledB }),
  error: Schema.TaggedStruct("ErrorB", {})
})
const Watch = Rpc.make("Watch", { success: Schema.String, stream: true })

type Rpcs = typeof GetA | typeof GetB | typeof Watch

type ResultA = Effect.Effect<{ readonly a: number }, { readonly _tag: "ErrorA" }, ScaleA>
type ResultB = Effect.Effect<{ readonly b: number }, { readonly _tag: "ErrorB" }, ScaleB>

describe("RpcClient.Flat", () => {
  const client = hole<RpcClient.RpcClient.Flat<Rpcs>>()

  it("infers the result of a single tag", () => {
    expect(client("GetA", { id: "a" })).type.toBe<ResultA>()
    expect(client("Watch", undefined)).type.toBe<Stream.Stream<string>>()
  })

  it("rejects an unknown tag or another tag's payload", () => {
    expect(client).type.not.toBeCallableWith("Missing", { id: "a" })
    expect(client).type.not.toBeCallableWith("GetA", { count: 1 })
  })

  it("infers a result per RPC for a union of tags", () => {
    const tag = hole<"GetA" | "GetB">()
    const payload = hole<{ readonly id: string } | { readonly count: number }>()

    expect(client(tag, payload)).type.toBe<ResultA | ResultB>()
    expect(client(tag, payload, { discard: true })).type.toBe<
      Effect.Effect<void, never, ScaleA> | Effect.Effect<void, never, ScaleB>
    >()
    expect(client).type.not.toBeCallableWith(tag, { name: "a" })
  })

  it("infers effects and streams for a union of tags", () => {
    const tag = hole<"GetA" | "Watch">()
    const payload = hole<{ readonly id: string } | void>()

    expect(client(tag, payload)).type.toBe<ResultA | Stream.Stream<string>>()
  })
})
