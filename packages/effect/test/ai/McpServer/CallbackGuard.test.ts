import { assert, describe, it } from "@effect/vitest"
import * as McpServer from "effect/ai/McpServer"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"

const zone = Dns.layerStatic({
  hosts: {
    "public.example": ["93.184.215.14", "2606:2800:21f:cb07:6820:80da:af6b:8b2c"],
    "loopback.example": ["127.0.0.1"],
    "private.example": ["10.0.0.5"],
    "metadata.example": ["169.254.169.254"],
    "ula.example": ["fd00::1"],
    "mixed.example": ["93.184.215.14", "192.168.1.10"],
    "localhost": ["127.0.0.1", "::1"],
    "empty.example": []
  }
})

const guardLayer = (options?: { readonly allowedHosts?: ReadonlyArray<string> | undefined }) =>
  McpServer.layerCallbackGuard(options).pipe(Layer.provide(zone))

const check = Effect.fnUntraced(function*(url: string) {
  const guard = yield* McpServer.CallbackGuard
  return yield* Effect.exit(guard.check(new URL(url)))
})

const assertAllowed = (url: string) => Effect.map(check(url), (exit) => assert.isTrue(Exit.isSuccess(exit), url))

const assertRefused = (url: string) =>
  Effect.map(check(url), (exit) => {
    assert.isTrue(Exit.isFailure(exit), url)
  })

describe("McpServer.layerCallbackGuard", () => {
  describe("host names", () => {
    it.effect("admits a name resolving only to global addresses", () =>
      assertAllowed("https://public.example/hook").pipe(Effect.provide(guardLayer())))

    it.effect("refuses names resolving to loopback, private, link-local, or unique-local addresses", () =>
      Effect.gen(function*() {
        yield* assertRefused("https://loopback.example/hook")
        yield* assertRefused("https://private.example/hook")
        yield* assertRefused("https://metadata.example/hook")
        yield* assertRefused("https://ula.example/hook")
        yield* assertRefused("https://localhost/hook")
      }).pipe(Effect.provide(guardLayer())))

    it.effect("refuses a name when any resolved address is not global", () =>
      assertRefused("https://mixed.example/hook").pipe(Effect.provide(guardLayer())))

    it.effect("refuses a name that does not resolve to any address", () =>
      Effect.gen(function*() {
        yield* assertRefused("https://unknown.example/hook")
        yield* assertRefused("https://empty.example/hook")
      }).pipe(Effect.provide(guardLayer())))

    it.effect("fails with a generic CallbackRejected", () =>
      Effect.gen(function*() {
        const guard = yield* McpServer.CallbackGuard
        const resolved = yield* Effect.flip(guard.check(new URL("https://private.example/hook")))
        const unresolved = yield* Effect.flip(guard.check(new URL("https://unknown.example/hook")))
        const literal = yield* Effect.flip(guard.check(new URL("https://10.0.0.1/hook")))
        assert.strictEqual(resolved._tag, "CallbackRejected")
        assert.strictEqual(resolved.message, unresolved.message)
        assert.strictEqual(resolved.message, literal.message)
      }).pipe(Effect.provide(guardLayer())))
  })

  describe("IP literals", () => {
    it.effect("admits global literals without resolving them", () =>
      Effect.gen(function*() {
        yield* assertAllowed("https://93.184.215.14/hook")
        yield* assertAllowed("https://[2606:4700:4700::1111]/hook")
      }).pipe(Effect.provide(guardLayer())))

    it.effect("refuses non-global literals", () =>
      Effect.gen(function*() {
        yield* assertRefused("https://127.0.0.1/hook")
        yield* assertRefused("https://0.0.0.0/hook")
        yield* assertRefused("https://192.168.1.1:8443/hook")
        yield* assertRefused("https://[::1]/hook")
        yield* assertRefused("https://[::ffff:127.0.0.1]/hook")
        yield* assertRefused("https://[fe80::1]/hook")
        // WHATWG URL parsing normalizes legacy IPv4 spellings before the check
        yield* assertRefused("https://2130706433/hook")
        yield* assertRefused("https://0x7f.1/hook")
      }).pipe(Effect.provide(guardLayer())))
  })

  describe("allowedHosts", () => {
    it.effect("admits listed hosts at any address and allows plaintext for them", () =>
      Effect.gen(function*() {
        const guard = yield* McpServer.CallbackGuard
        yield* assertAllowed("http://LOCALHOST:3000/hook")
        yield* assertAllowed("http://127.0.0.1:3000/hook")
        yield* assertAllowed("http://[::1]:3000/hook")
        assert.isTrue(guard.allowsPlaintext?.(new URL("http://localhost:3000/hook")))
        assert.isTrue(guard.allowsPlaintext?.(new URL("http://127.0.0.1:3000/hook")))
        assert.isTrue(guard.allowsPlaintext?.(new URL("http://[0:0::1]:3000/hook")))
      }).pipe(Effect.provide(guardLayer({ allowedHosts: ["localhost", "127.0.0.1", "[::1]"] }))))

    it.effect("admits a listed name without resolving it", () =>
      assertAllowed("http://receiver.internal/hook").pipe(
        Effect.provide(guardLayer({ allowedHosts: ["Receiver.Internal"] }))
      ))

    it.effect("keeps checking and refusing plaintext for other hosts", () =>
      Effect.gen(function*() {
        const guard = yield* McpServer.CallbackGuard
        yield* assertRefused("https://private.example/hook")
        yield* assertRefused("https://127.0.0.2/hook")
        assert.isFalse(guard.allowsPlaintext?.(new URL("http://public.example/hook")))
        assert.isFalse(guard.allowsPlaintext?.(new URL("http://127.0.0.2/hook")))
      }).pipe(Effect.provide(guardLayer({ allowedHosts: ["localhost", "127.0.0.1"] }))))

    it.effect("allows no plaintext without allowedHosts", () =>
      Effect.gen(function*() {
        const guard = yield* McpServer.CallbackGuard
        assert.isFalse(guard.allowsPlaintext?.(new URL("http://public.example/hook")))
        assert.isFalse(guard.allowsPlaintext?.(new URL("http://localhost/hook")))
      }).pipe(Effect.provide(guardLayer())))
  })
})
