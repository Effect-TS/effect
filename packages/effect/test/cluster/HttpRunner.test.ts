import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Layer, Schema } from "effect"
import { HttpRunner, RunnerAddress, Runners } from "effect/unstable/cluster"
import { HttpClient, HttpClientRequest, HttpClientResponse, HttpRouter } from "effect/unstable/http"
import { Rpc, RpcClient, RpcGroup, RpcSerialization, RpcServer } from "effect/unstable/rpc"
import { Socket } from "effect/unstable/socket"

declare module "vitest" {
  interface TaskMeta {
    httpRunner?: unknown
    httpRunnerDisposed?: boolean
  }
}

const address = RunnerAddress.make("runner.example", 8080)
const Rpcs = RpcGroup.make(Rpc.make("Ping", { success: Schema.String }))

const cases = [
  { name: "slash-prefixed", path: "/runner", expectedPath: "/runner" },
  { name: "slashless control", path: "runner", expectedPath: "/runner" },
  { name: "empty control", path: "", expectedPath: "/" },
  { name: "root", path: "/", expectedPath: "/" },
  { name: "shipped default", path: undefined, expectedPath: "/" },
  { name: "nested", path: "/api/runner", expectedPath: "/api/runner" },
  { name: "nested slashless control", path: "api/runner", expectedPath: "/api/runner" },
  { name: "secure", path: "/runner", https: true, expectedPath: "/runner" },
  { name: "secure slashless control", path: "runner", https: true, expectedPath: "/runner" },
  { name: "interior duplicates", path: "/api//runner", expectedPath: "/api//runner" },
  {
    name: "interior duplicates slashless control",
    path: "api//runner",
    expectedPath: "/api//runner"
  },
  { name: "intentional leading duplicates", path: "//runner", expectedPath: "//runner" }
] as const

describe("HttpRunner HTTP (in-process real RPC)", () => {
  for (
    const testCase of [...cases, {
      name: "normalized router masks slash-prefixed path",
      path: "/runner",
      expectedPath: "/runner",
      normalized: true
    }, {
      name: "normalized router masks shipped default",
      path: undefined,
      expectedPath: "/",
      normalized: true
    }] as const
  ) {
    it.effect(testCase.name, ({ task }) =>
      Effect.gen(function*() {
        const normalized = "normalized" in testCase && testCase.normalized
        const https = "https" in testCase && testCase.https
        let routeHits = 0
        let rpcHits = 0
        const requests: Array<{ url: string; pathname: string; method: string }> = []
        const statuses: Array<number> = []
        const routes = HttpRouter.use(Effect.fnUntraced(function*(router) {
          const httpEffect = yield* RpcServer.toHttpEffect(Rpcs)
          yield* router.add(
            "POST",
            testCase.expectedPath,
            Effect.suspend(() => {
              routeHits++
              return httpEffect
            })
          )
        })).pipe(
          Layer.provide(Rpcs.toLayer({
            Ping: () =>
              Effect.sync(() => {
                rpcHits++
                return "pong"
              })
          })),
          Layer.provide(RpcSerialization.layerJson)
        )
        const { dispose, handler } = HttpRouter.toWebHandler(routes, {
          disableLogger: true,
          ...(normalized ? {} : { routerConfig: { ignoreDuplicateSlashes: false } })
        })
        yield* Effect.addFinalizer(() =>
          Effect.gen(function*() {
            yield* Effect.promise(dispose)
            task.meta.httpRunnerDisposed = true
          })
        )

        const recordingClient = HttpClient.make((request) =>
          Effect.gen(function*() {
            // Convert the actual outgoing request, including URL, method, headers,
            // and serialized RPC body. Never substitute the registered route URL.
            const webRequest = yield* HttpClientRequest.toWeb(request).pipe(Effect.orDie)
            requests.push({
              url: webRequest.url,
              pathname: new URL(webRequest.url).pathname,
              method: webRequest.method
            })
            const response = yield* Effect.promise(() => handler(webRequest))
            statuses.push(response.status)
            return HttpClientResponse.fromWeb(request, response)
          })
        )
        const clientLayer = testCase.path === undefined
          ? HttpRunner.layerClientProtocolHttpDefault
          : HttpRunner.layerClientProtocolHttp({ path: testCase.path, https })
        const exit = yield* Effect.gen(function*() {
          const runnerProtocol = yield* Runners.RpcClientProtocol
          const protocol = yield* runnerProtocol.make(address)
          const client = yield* RpcClient.make(Rpcs).pipe(Effect.provideService(RpcClient.Protocol, protocol))
          return yield* client.Ping()
        }).pipe(
          Effect.provide(clientLayer.pipe(
            Layer.provide(RpcSerialization.layerJson),
            Layer.provide(Layer.succeed(HttpClient.HttpClient, recordingClient))
          )),
          Effect.exit
        )

        const observation = {
          transport: "http",
          name: testCase.name,
          normalized,
          requests,
          statuses,
          routeHits,
          rpcHits,
          exit: Exit.isSuccess(exit) ? { _tag: exit._tag, value: exit.value } : { _tag: exit._tag }
        }
        task.meta.httpRunner = {
          ...observation,
          ...(Exit.isFailure(exit) ? { cause: Cause.pretty(exit.cause) } : {})
        }
        const prefixPath = testCase.expectedPath
        // Existing prependUrl(prefix) + post("") retains/adds a trailing slash.
        // That shared behavior is not part of this boundary fix.
        const pathname = prefixPath.endsWith("/") ? prefixPath : `${prefixPath}/`
        assert.deepStrictEqual(observation, {
          transport: "http",
          name: testCase.name,
          normalized,
          requests: [{ url: `http${https ? "s" : ""}://runner.example:8080${pathname}`, pathname, method: "POST" }],
          statuses: [200],
          routeHits: 1,
          rpcHits: 1,
          exit: { _tag: "Success", value: "pong" }
        })
      }))
  }
})

describe("HttpRunner WebSocket constructor acquisition (no native connection or RPC exchange)", () => {
  for (const testCase of cases) {
    it.effect(testCase.name, ({ task }) =>
      Effect.gen(function*() {
        const connected = yield* Deferred.make<void>()
        const https = "https" in testCase && testCase.https
        const urls: Array<string> = []
        const closed: Array<number | undefined> = []
        const listeners = new Set<(event: Socket.WebSocketEvent) => void>()
        let sends = 0
        let readerAcquired = false
        const constructor: Socket.WebSocketConstructor["Service"] = (url) => {
          urls.push(url)
          return {
            readyState: 1,
            addEventListener: (_type, listener) => {
              listeners.add(listener)
            },
            removeEventListener: (_type, listener) => {
              listeners.delete(listener)
            },
            close: (code) => {
              closed.push(code)
            },
            send: () => {
              sends++
            }
          }
        }
        const clientLayer = testCase.path === undefined
          ? HttpRunner.layerClientProtocolWebsocketDefault
          : HttpRunner.layerClientProtocolWebsocket({ path: testCase.path, https })
        const exit = yield* Effect.gen(function*() {
          const runnerProtocol = yield* Runners.RpcClientProtocol
          const protocol = yield* runnerProtocol.make(address)
          yield* RpcClient.make(Rpcs).pipe(Effect.provideService(RpcClient.Protocol, protocol))
          // Finite barrier: onConnect runs only after the socket reader was
          // acquired. The test does not mistake a lazy factory for acquisition.
          yield* Deferred.await(connected)
          readerAcquired = true
          assert.strictEqual(listeners.size, 3)
        }).pipe(
          Effect.provide(clientLayer.pipe(
            Layer.provide(RpcSerialization.layerJson),
            Layer.provide(Layer.succeed(Socket.WebSocketConstructor, constructor))
          )),
          Effect.provideService(RpcClient.ConnectionHooks, {
            onConnect: Deferred.succeed(connected, undefined).pipe(Effect.asVoid),
            onDisconnect: Effect.void
          }),
          // This inner scope intentionally closes before cleanup assertions.
          Effect.scoped,
          Effect.exit
        )
        const observation = {
          transport: "websocket-constructor-only",
          name: testCase.name,
          urls,
          readerAcquired,
          closed,
          remainingListeners: listeners.size,
          sends,
          exit: exit._tag
        }
        task.meta.httpRunner = observation
        const pathname = testCase.expectedPath
        assert.deepStrictEqual(observation, {
          transport: "websocket-constructor-only",
          name: testCase.name,
          urls: [`ws${https ? "s" : ""}://runner.example:8080${pathname}`],
          readerAcquired: true,
          closed: [1000],
          remainingListeners: 0,
          sends: 0,
          exit: "Success"
        })
      }))
  }
})
