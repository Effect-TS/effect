import { assert, describe, it } from "@effect/vitest"
import * as McpServer from "effect/ai/McpServer"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"

const zone = Dns.layerStatic({
  hosts: {
    "public.example": ["93.184.215.14", "2606:2800:21f:cb07:6820:80da:af6b:8b2c"],
    "private.example": ["10.0.0.5"],
    "mixed.example": ["93.184.215.14", "192.168.1.10"],
    "localhost": ["127.0.0.1", "::1"],
    "empty.example": []
  }
})

const guardLayer = (options?: { readonly allowedHosts?: ReadonlyArray<string> | undefined }) =>
  McpServer.layerCallbackGuard(options).pipe(Layer.provide(zone))

describe("McpServer.layerCallbackGuard", () => {
  it.effect("admits global hosts and literals and refuses non-global, mixed, or unresolved hosts generically", () =>
    Effect.gen(function*() {
      const guard = yield* McpServer.CallbackGuard
      for (
        const url of [
          "https://public.example/hook",
          "https://93.184.215.14/hook",
          "https://[2606:4700:4700::1111]/hook"
        ]
      ) {
        assert.isTrue(Exit.isSuccess(yield* Effect.exit(guard.check(new URL(url)))), url)
      }
      const refused = yield* Effect.forEach(
        [
          "https://private.example/hook",
          "https://mixed.example/hook",
          "https://unknown.example/hook",
          "https://empty.example/hook",
          "https://127.0.0.1/hook",
          "https://[::1]/hook"
        ],
        (url) => Effect.flip(guard.check(new URL(url)))
      )
      for (const error of refused) {
        assert.strictEqual(error._tag, "CallbackRejected")
        assert.strictEqual(error.message, refused[0].message)
      }
      assert.isFalse(guard.allowsPlaintext?.(new URL("http://public.example/hook")))
      assert.isFalse(guard.allowsPlaintext?.(new URL("http://localhost/hook")))
    }).pipe(Effect.provide(guardLayer())))

  it.effect("admits allowedHosts without resolving and allows plaintext only for them", () =>
    Effect.gen(function*() {
      const guard = yield* McpServer.CallbackGuard
      for (
        const url of [
          "http://LOCALHOST:3000/hook",
          "http://127.0.0.1:3000/hook",
          "http://[::1]:3000/hook",
          "http://receiver.internal/hook"
        ]
      ) {
        assert.isTrue(Exit.isSuccess(yield* Effect.exit(guard.check(new URL(url)))), url)
      }
      assert.isTrue(guard.allowsPlaintext?.(new URL("http://localhost:3000/hook")))
      assert.isTrue(guard.allowsPlaintext?.(new URL("http://[0:0::1]:3000/hook")))

      assert.isTrue(Exit.isFailure(yield* Effect.exit(guard.check(new URL("https://private.example/hook")))))
      assert.isTrue(Exit.isFailure(yield* Effect.exit(guard.check(new URL("https://127.0.0.2/hook")))))
      assert.isFalse(guard.allowsPlaintext?.(new URL("http://public.example/hook")))
      assert.isFalse(guard.allowsPlaintext?.(new URL("http://127.0.0.2/hook")))
    }).pipe(Effect.provide(guardLayer({ allowedHosts: ["localhost", "127.0.0.1", "[::1]", "Receiver.Internal"] }))))
})
