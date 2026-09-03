import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Layer, Schema, Stream } from "effect"
import { AtomRegistry, AtomRpc } from "effect/unstable/reactivity"
import { Rpc, RpcGroup, RpcMiddleware, RpcTest } from "effect/unstable/rpc"

class ClientError extends Schema.Error<ClientError>("ClientError")({ _tag: Schema.tag("ClientError") }) {}
class ServerError extends Schema.Error<ServerError>("ServerError")({ _tag: Schema.tag("ServerError") }) {}
class DeclaredError extends Schema.Error<DeclaredError>("DeclaredError")({ _tag: Schema.tag("DeclaredError") }) {}
class Middleware extends RpcMiddleware.Service<Middleware, { clientError: ClientError }>()("Middleware", {
  error: ServerError,
  requiredForClient: true
}) {}

const clientError = new ClientError()
const serverError = new ServerError()
const declaredError = new DeclaredError()
const group = RpcGroup.make(
  Rpc.make("unary", { payload: { failure: Schema.String }, success: Schema.Number, error: DeclaredError }),
  Rpc.make("stream", {
    payload: { failure: Schema.String },
    success: Schema.Number,
    error: DeclaredError,
    stream: true
  })
).middleware(Middleware)

const Client = AtomRpc.Service()("MiddlewareClient", {
  group,
  makeEffect: RpcTest.makeClient(group, { flatten: true }),
  protocol: Layer.mergeAll(
    group.toLayer({
      unary: ({ failure }) => failure === "declared" ? Effect.fail(declaredError) : Effect.succeed(42),
      stream: ({ failure }) => failure === "declared" ? Stream.fail(declaredError) : Stream.make(42)
    }),
    Layer.succeed(
      Middleware,
      (effect, { headers }) => headers.failure === "server" ? Effect.fail(serverError) : effect
    ),
    RpcMiddleware.layerClient(
      Middleware,
      ({ next, request }) => request.headers.failure === "client" ? Effect.fail(clientError) : next(request)
    )
  )
})

const invoke = (registry: AtomRegistry.AtomRegistry, operation: "query" | "mutation" | "stream", failure: string) => {
  if (operation === "mutation") {
    const atom = Client.mutation("unary")
    registry.set(atom, { payload: { failure }, headers: { failure } })
    return AtomRegistry.getResult(registry, atom).pipe(Effect.map((value) => [value]))
  }
  if (operation === "stream") {
    return AtomRegistry.getResult(registry, Client.query("stream", { failure }, { headers: { failure } })).pipe(
      Effect.map((value) => Array.from(value.items))
    )
  }
  return AtomRegistry.getResult(registry, Client.query("unary", { failure }, { headers: { failure } })).pipe(
    Effect.map((value) => [value])
  )
}

describe("AtomRpc real middleware preservation", () => {
  for (const operation of ["query", "mutation", "stream"] as const) {
    for (
      const [failure, error] of [["client", clientError], ["server", serverError], ["declared", declaredError]] as const
    ) {
      it.effect(`${operation} retains ${failure} failure`, () =>
        Effect.gen(function*() {
          const registry = yield* Effect.acquireRelease(
            Effect.sync(() => AtomRegistry.make()),
            (registry) => Effect.sync(() => registry.dispose())
          )
          if (operation === "mutation") {
            yield* AtomRegistry.mount(registry, Client.mutation("unary"))
          }
          const result = yield* Effect.exit(invoke(registry, operation, failure))
          assert(Exit.isFailure(result))
          assert.deepStrictEqual(
            result.cause.reasons.map((reason) => reason._tag === "Fail" ? reason.error : reason),
            [error]
          )
        }))
    }

    it.effect(`${operation} retains ordinary success`, () =>
      Effect.gen(function*() {
        const registry = yield* Effect.acquireRelease(
          Effect.sync(() => AtomRegistry.make()),
          (registry) => Effect.sync(() => registry.dispose())
        )
        if (operation === "mutation") {
          yield* AtomRegistry.mount(registry, Client.mutation("unary"))
        }
        const result = yield* invoke(registry, operation, "none")
        assert.deepStrictEqual(result, [42])
      }))
  }
})
