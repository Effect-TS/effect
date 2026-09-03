import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Exit, Layer, Schema } from "effect"
import { HttpClient, HttpClientResponse } from "effect/unstable/http"
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { Atom, AtomHttpApi, AtomRegistry, AtomRpc } from "effect/unstable/reactivity"
import { Rpc, RpcClient, RpcGroup } from "effect/unstable/rpc"

const cases: ReadonlyArray<{
  name: string
  options: { readonly timeToLive?: Duration.Input | undefined }
  idleTTL: number | undefined
  keepAlive: boolean
  second: number
}> = [
  { name: "number zero", options: { timeToLive: 0 }, idleTTL: 0, keepAlive: false, second: 2 },
  { name: "bigint zero", options: { timeToLive: 0n }, idleTTL: 0, keepAlive: false, second: 2 },
  { name: "Duration.zero", options: { timeToLive: Duration.zero }, idleTTL: 0, keepAlive: false, second: 2 },
  { name: "string zero", options: { timeToLive: "0 millis" }, idleTTL: 0, keepAlive: false, second: 2 },
  { name: "tuple zero", options: { timeToLive: [0, 0] }, idleTTL: 0, keepAlive: false, second: 2 },
  { name: "object zero", options: { timeToLive: { milliseconds: 0 } }, idleTTL: 0, keepAlive: false, second: 2 },
  { name: "omitted", options: {}, idleTTL: undefined, keepAlive: false, second: 1 },
  { name: "undefined", options: { timeToLive: undefined }, idleTTL: undefined, keepAlive: false, second: 1 },
  { name: "positive", options: { timeToLive: 60_000 }, idleTTL: 60_000, keepAlive: false, second: 1 },
  { name: "Infinity", options: { timeToLive: Infinity }, idleTTL: undefined, keepAlive: true, second: 1 }
]

const group = RpcGroup.make(
  Rpc.make("read", { success: Schema.Number }),
  Rpc.make("watch", { success: Schema.Number, stream: true })
)
const api = HttpApi.make("ttl").add(
  HttpApiGroup.make("nested").add(HttpApiEndpoint.get("read", "/read", { success: Schema.Number }))
)

const setup = Effect.gen(function*() {
  let rpcReads = 0
  let httpReads = 0
  const RpcService = AtomRpc.Service()("TtlRpcClient", {
    group,
    protocol: Layer.empty,
    makeEffect: Effect.gen(function*() {
      const rpc = yield* RpcClient.makeNoSerialization(group, {
        flatten: true,
        onFromClient: ({ message }): Effect.Effect<void> =>
          Effect.suspend(() => {
            if (message._tag !== "Request") return Effect.void
            if (message.tag === "watch") {
              return rpc.write({ _tag: "Exit", clientId: 0, requestId: message.id, exit: Exit.void })
            }
            return rpc.write({ _tag: "Exit", clientId: 0, requestId: message.id, exit: Exit.succeed(++rpcReads) })
          })
      })
      return rpc.client
    })
  })
  const HttpService = AtomHttpApi.Service()("TtlHttpClient", {
    api,
    baseUrl: "https://example.test",
    httpClient: Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.sync(() =>
          HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify(++httpReads), {
              headers: { "content-type": "application/json" }
            })
          )
        )
      )
    )
  })
  const registry = yield* Effect.acquireRelease(
    Effect.sync(() => AtomRegistry.make({ defaultIdleTTL: 60_000 })),
    (registry) => Effect.sync(() => registry.dispose())
  )
  return { RpcService, HttpService, registry, rpcReads: () => rpcReads, httpReads: () => httpReads }
})

// Public atom finalization is a barrier behind the query's queued unmount.
// This uses the registry's ordinary scheduler, without waiting on a TTL timer.
const removalBarrier = (registry: AtomRegistry.AtomRegistry) =>
  Effect.callback<void>((resume) => {
    const barrier = Atom.make((get) => {
      get.addFinalizer(() => resume(Effect.void))
      return undefined
    }).pipe(Atom.setIdleTTL(0))
    const unmount = registry.mount(barrier)
    unmount()
  })

describe("Atom query zero TTL", () => {
  for (const testCase of cases) {
    for (const adapter of ["RPC unary", "RPC stream", "HTTP"] as const) {
      it.effect(`${adapter}: ${testCase.name} metadata`, () =>
        Effect.gen(function*() {
          const { HttpService, RpcService } = yield* setup
          const atom = adapter === "HTTP"
            ? HttpService.query("nested", "read", testCase.options)
            : adapter === "RPC stream"
            ? RpcService.query("watch", undefined, testCase.options)
            : RpcService.query("read", undefined, testCase.options)
          assert.strictEqual(atom.idleTTL, testCase.idleTTL)
          assert.strictEqual(atom.keepAlive, testCase.keepAlive)
        }))
    }

    for (const adapter of ["RPC", "HTTP"] as const) {
      it.effect(`${adapter}: ${testCase.name} returned value after unmount and remount`, () =>
        Effect.gen(function*() {
          const { HttpService, RpcService, httpReads, registry, rpcReads } = yield* setup
          const atom = adapter === "HTTP"
            ? HttpService.query("nested", "read", testCase.options)
            : RpcService.query("read", undefined, testCase.options)
          const reads = adapter === "HTTP" ? httpReads : rpcReads
          const unmount = registry.mount(atom)
          assert.strictEqual(yield* AtomRegistry.getResult(registry, atom), 1)
          assert.strictEqual(reads(), 1)
          unmount()
          yield* removalBarrier(registry)
          yield* AtomRegistry.mount(registry, atom)
          assert.strictEqual(yield* AtomRegistry.getResult(registry, atom), testCase.second)
          assert.strictEqual(reads(), testCase.second)
        }))
    }
  }
})
