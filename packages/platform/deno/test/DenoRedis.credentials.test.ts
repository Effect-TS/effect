import * as DenoRedis from "@effect/platform-deno/DenoRedis"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const makeListener = Effect.acquireRelease(
  Effect.sync(() => Deno.listen({ hostname: "127.0.0.1", port: 0 })),
  (listener) => Effect.sync(() => listener.close())
)

const accept = (listener: Deno.TcpListener) =>
  Effect.acquireRelease(
    Effect.promise(() => listener.accept()),
    (connection) => Effect.sync(() => connection.close())
  )

const authenticate = (
  makeUrl: (port: number) => string,
  options?: Omit<DenoRedis.RedisOptions, "url">
) =>
  Effect.gen(function*() {
    const listener = yield* makeListener
    const server = yield* Effect.gen(function*() {
      const connection = yield* accept(listener)
      const buffer = new Uint8Array(256)
      const size = yield* Effect.promise(() => connection.read(buffer))
      yield* Effect.promise(() => connection.write(encoder.encode("+OK\r\n")))
      return size === null ? "" : decoder.decode(buffer.subarray(0, size))
    }).pipe(Effect.forkChild)

    const port = (listener.addr as Deno.NetAddr).port
    yield* Layer.build(DenoRedis.layer({ url: makeUrl(port), ...options }))
    return yield* Fiber.join(server)
  })

const resp = (...args: ReadonlyArray<string>) =>
  `*${args.length}\r\n` + args.map((arg) => `$${encoder.encode(arg).length}\r\n${arg}\r\n`).join("")

it.effect("decodes URL authority credentials once", () =>
  Effect.gen(function*() {
    const request = yield* authenticate((port) => `redis://app%3A%2540:p%40ss%2525@127.0.0.1:${port}`)
    assert.strictEqual(request, resp("AUTH", "app:%40", "p@ss%25"))
  }))

it.effect("does not decode a query-string password twice", () =>
  Effect.gen(function*() {
    const request = yield* authenticate((port) => `redis://alice@127.0.0.1:${port}/?password=p%2540ss`)
    assert.strictEqual(request, resp("AUTH", "alice", "p%40ss"))
  }))

it.effect("prefers explicit credentials without decoding them", () =>
  Effect.gen(function*() {
    const request = yield* authenticate(
      (port) => `redis://ignored:ignored@127.0.0.1:${port}`,
      { username: "app%user", password: "p%ss" }
    )
    assert.strictEqual(request, resp("AUTH", "app%user", "p%ss"))
  }))
