import { Context, Effect, hole, Layer, Schema } from "effect"
import { type Atom, AtomRegistry, AtomRpc } from "effect/reactivity"
import { Rpc, type RpcClientError, RpcGroup, RpcMiddleware } from "effect/rpc"
import { describe, expect, it } from "tstyche"

describe("AtomRpc", () => {
  class ServerDependency extends Context.Service<
    ServerDependency,
    {}
  >()("ServerDependency") {}

  class RequiringMiddleware extends RpcMiddleware.Service<RequiringMiddleware, {
    requires: ServerDependency
  }>()("RequiringMiddleware", {}) {}

  const RequiringGroup = RpcGroup.make(
    Rpc.make("getUser", {
      success: Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      })
    }).middleware(RequiringMiddleware)
  )

  it("query supports RPCs whose middleware declares service requirements", () => {
    const Client = AtomRpc.Service()("RequiringClient", {
      group: RequiringGroup,
      protocol: Layer.empty,
      makeEffect: Effect.die("unused")
    })

    const query = Client.query("getUser", undefined)

    expect<Atom.Success<typeof query>>().type.toBe<{
      readonly id: number
      readonly name: string
    }>()
  })

  it("query and mutation infer a union of tags", () => {
    const A = Rpc.make("A", { payload: { id: Schema.String }, success: Schema.Number })
    const B = Rpc.make("B", { success: Schema.String })
    const client = hole<AtomRpc.AtomRpcClient<unknown, "Client", typeof A | typeof B>>()
    const tag = hole<"A" | "B">()
    const query = client.query(tag, hole<{ readonly id: string } | void>())
    const mutation = client.mutation(tag)

    expect<Atom.Success<typeof query>>().type.toBe<number | string>()
    expect<Atom.Success<typeof mutation>>().type.toBe<number | string>()
  })

  it("query returns a pull atom for stream RPCs", () => {
    const Events = Rpc.make("Events", { success: Schema.String, error: Schema.Number, stream: true })
    const client = hole<AtomRpc.AtomRpcClient<unknown, "Client", typeof Events>>()

    expect(client.query("Events", undefined)).type.toBe<
      Atom.Writable<Atom.PullResult<string, number | RpcClientError.RpcClientError>, void>
    >()
  })

  it("mutation accepts only the payload of the selected RPC", () => {
    const A = Rpc.make("A", { payload: { id: Schema.String } })
    const B = Rpc.make("B", { payload: { name: Schema.String } })
    const client = hole<AtomRpc.AtomRpcClient<unknown, "Client", typeof A | typeof B>>()
    const registry = AtomRegistry.make()

    expect(registry.set).type.toBeCallableWith(client.mutation("A"), { payload: { id: "a" } })
    expect(registry.set).type.not.toBeCallableWith(client.mutation("A"), { payload: { name: "b" } })
  })

  it("query accepts a tag and payload forwarded from a generic caller", () => {
    const A = Rpc.make("A", { payload: { id: Schema.String }, success: Schema.Number })
    const B = Rpc.make("B", { success: Schema.String })
    type Rpcs = typeof A | typeof B
    const client = hole<AtomRpc.AtomRpcClient<unknown, "Client", Rpcs>>()
    const query = <Tag extends Rpc.Tag<Rpcs>>(
      tag: Tag,
      payload: Rpc.PayloadConstructor<Rpc.ExtractTag<Rpcs, Tag>>
    ) => client.query(tag, payload)

    expect<Atom.Success<ReturnType<typeof query<"A">>>>().type.toBe<number>()
  })

  it("query and mutation reject non-string tags when the RPC tag is widened to string", () => {
    const Dynamic = Rpc.make("A" as string, { success: Schema.Number })
    const client = hole<AtomRpc.AtomRpcClient<unknown, "Client", typeof Dynamic>>()

    expect(client.query).type.not.toBeCallableWith(123, undefined)
    expect(client.mutation).type.not.toBeCallableWith(123)
  })

  it("accepts any reactivity keys when no keys are declared", () => {
    const GetUser = Rpc.make("GetUser", { payload: { id: Schema.Number } })
    const client = hole<AtomRpc.AtomRpcClient<unknown, "Client", typeof GetUser>>()
    const keys = hole<ReadonlyArray<unknown>>()

    expect(client.query).type.toBeCallableWith("GetUser", { id: 1 }, { reactivityKeys: keys })
    expect(client.query).type.toBeCallableWith("GetUser", { id: 1 }, { reactivityKeys: { anything: [{ id: 1 }] } })
    expect(AtomRegistry.make().set).type.toBeCallableWith(client.mutation("GetUser"), {
      payload: { id: 1 },
      reactivityKeys: keys
    })
  })
})
