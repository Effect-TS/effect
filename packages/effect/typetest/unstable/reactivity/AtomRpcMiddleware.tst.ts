import { type Cause, type Effect, Schema, type Stream } from "effect"
import type { Atom, AtomRpc } from "effect/unstable/reactivity"
import { Rpc, type RpcClient, type RpcClientError, RpcGroup, RpcMiddleware } from "effect/unstable/rpc"
import { describe, expect, it } from "tstyche"

class ClientError extends Schema.Error<ClientError>("ClientError")({ _tag: Schema.tag("ClientError") }) {}
class OtherClientError extends Schema.Error<OtherClientError>("OtherClientError")({
  _tag: Schema.tag("OtherClientError")
}) {}
class ServerError extends Schema.Error<ServerError>("ServerError")({ _tag: Schema.tag("ServerError") }) {}
class DeclaredError extends Schema.Error<DeclaredError>("DeclaredError")({ _tag: Schema.tag("DeclaredError") }) {}
class Middleware extends RpcMiddleware.Service<Middleware, { clientError: ClientError }>()("Middleware", {
  error: ServerError,
  requiredForClient: true
}) {}
class OtherMiddleware extends RpcMiddleware.Service<OtherMiddleware, { clientError: OtherClientError }>()(
  "OtherMiddleware"
) {}
class ServerOnly extends RpcMiddleware.Service<ServerOnly>()("ServerOnly", { error: ServerError }) {}

const unary = Rpc.make("unary", { success: Schema.Number, error: DeclaredError })
const stream = Rpc.make("stream", { success: Schema.Number, error: DeclaredError, stream: true })
const group = RpcGroup.make(unary.middleware(Middleware), stream.middleware(Middleware))
const unionGroup = group.middleware(OtherMiddleware)
const plainGroup = RpcGroup.make(unary, stream)
const serverGroup = plainGroup.middleware(ServerOnly)
declare const client: AtomRpc.AtomRpcClient<never, "Client", RpcGroup.Rpcs<typeof group>>
declare const unionClient: AtomRpc.AtomRpcClient<never, "UnionClient", RpcGroup.Rpcs<typeof unionGroup>>
declare const plainClient: AtomRpc.AtomRpcClient<never, "PlainClient", RpcGroup.Rpcs<typeof plainGroup>>
declare const serverClient: AtomRpc.AtomRpcClient<never, "ServerClient", RpcGroup.Rpcs<typeof serverGroup>>
declare const direct: RpcClient.RpcClient.Flat<RpcGroup.Rpcs<typeof group>, RpcClientError.RpcClientError>

type BaseError = DeclaredError | RpcClientError.RpcClientError
type ExpectedError = BaseError | ServerError | ClientError

describe("AtomRpc client middleware errors", () => {
  it("preserves client errors in unary, mutation, and stream results", () => {
    const query = client.query("unary", undefined)
    const mutation = client.mutation("unary")
    const watch = client.query("stream", undefined)
    expect<Atom.Failure<typeof query>>().type.toBe<ExpectedError>()
    expect<Atom.Failure<typeof mutation>>().type.toBe<ExpectedError>()
    expect<Atom.Failure<typeof watch>>().type.toBe<ExpectedError | Cause.NoSuchElementError>()
  })

  it("preserves unions of middleware client errors", () => {
    const query = unionClient.query("unary", undefined)
    const mutation = unionClient.mutation("unary")
    const watch = unionClient.query("stream", undefined)
    expect<Atom.Failure<typeof query>>().type.toBe<ExpectedError | OtherClientError>()
    expect<Atom.Failure<typeof mutation>>().type.toBe<ExpectedError | OtherClientError>()
    expect<Atom.Failure<typeof watch>>().type.toBe<ExpectedError | OtherClientError | Cause.NoSuchElementError>()
  })

  it("matches the already-correct direct generated client", () => {
    const unary = direct("unary", undefined)
    const watch = direct("stream", undefined)
    expect<Effect.Error<typeof unary>>().type.toBe<ExpectedError>()
    expect<Stream.Error<typeof watch>>().type.toBe<ExpectedError>()
    expect<Effect.Success<typeof unary>>().type.toBe<number>()
    expect<Stream.Success<typeof watch>>().type.toBe<number>()
  })

  it("preserves declared errors without middleware and all success types", () => {
    const query = plainClient.query("unary", undefined)
    const mutation = plainClient.mutation("unary")
    const watch = plainClient.query("stream", undefined)
    expect<Atom.Failure<typeof query>>().type.toBe<BaseError>()
    expect<Atom.Failure<typeof mutation>>().type.toBe<BaseError>()
    expect<Atom.Failure<typeof watch>>().type.toBe<BaseError | Cause.NoSuchElementError>()
    expect<Atom.Success<typeof query>>().type.toBe<number>()
    expect<Atom.Success<typeof mutation>>().type.toBe<number>()
    expect<Atom.PullSuccess<typeof watch>>().type.toBe<number>()
  })

  it("does not add client errors to server-only middleware", () => {
    const query = serverClient.query("unary", undefined)
    const mutation = serverClient.mutation("unary")
    const watch = serverClient.query("stream", undefined)
    expect<Atom.Failure<typeof query>>().type.toBe<BaseError | ServerError>()
    expect<Atom.Failure<typeof mutation>>().type.toBe<BaseError | ServerError>()
    expect<Atom.Failure<typeof watch>>().type.toBe<BaseError | ServerError | Cause.NoSuchElementError>()
  })
})
