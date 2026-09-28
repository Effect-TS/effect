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

type ResultA = Effect.Effect<{ readonly a: number }, { readonly _tag: "ErrorA" }, ScaleA>
type ResultB = Effect.Effect<{ readonly b: number }, { readonly _tag: "ErrorB" }, ScaleB>

describe("RpcClient.Flat", () => {
  const client = hole<RpcClient.RpcClient.Flat<typeof GetA | typeof GetB | typeof Watch>>()

  it("infers the result of a single tag", () => {
    expect(client("GetA", { id: "a" })).type.toBe<ResultA>()
    expect(client).type.not.toBeCallableWith("GetA", { count: 1 })
  })

  it("infers a result per RPC for a union of tags", () => {
    const tag = hole<"GetA" | "GetB">()

    expect(client(tag, hole<{ readonly id: string } | { readonly count: number }>())).type.toBe<ResultA | ResultB>()
    expect(client).type.not.toBeCallableWith(tag, { name: "a" })
  })

  it("infers effects and streams for a union of tags", () => {
    const tag = hole<"GetA" | "Watch">()

    expect(client(tag, hole<{ readonly id: string } | void>())).type.toBe<ResultA | Stream.Stream<string>>()
  })
})
