import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit } from "effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import * as HttpServer from "effect/unstable/http/HttpServer"
import * as NetAddress from "effect/unstable/net/NetAddress"

describe("HttpServer", () => {
  it("accepts a canonical socket address", () => {
    const address = NetAddress.inetAddressUnsafe(NetAddress.ipv4Loopback, 8080)
    const server = HttpServer.make({
      address,
      serve: () => Effect.void
    })

    assert.strictEqual(server.address, address)
  })

  it("formats unscoped addresses and rejects scoped IPv6 addresses", () => {
    for (
      const [input, expected] of [
        ["127.0.0.1:3000", "http://127.0.0.1:3000"],
        ["[::1]:3000", "http://[::1]:3000"],
        ["[fe80::1%0]:3000", "http://[fe80::1]:3000"]
      ]
    ) {
      const formatted = HttpServer.formatAddress(NetAddress.inetAddressFromStringUnsafe(input))
      assert.strictEqual(formatted, expected)
      assert.doesNotThrow(() => new URL(formatted))
    }
    assert.throws(
      () => HttpServer.formatAddress(NetAddress.inetAddressFromStringUnsafe("[fe80::1%2]:3000")),
      /scoped IPv6 addresses are not supported/
    )
  })

  it.effect("uses IPv4 fallback for unspecified listeners and preserves concrete IPv6 hosts", () =>
    Effect.gen(function*() {
      for (
        const [input, expected] of [
          ["0.0.0.0:3000", "http://127.0.0.1:3000"],
          ["[::]:3000", "http://127.0.0.1:3000"],
          ["[::1]:3000", "http://[::1]:3000"],
          ["[2001:db8::1]:3000", "http://[2001:db8::1]:3000"]
        ]
      ) {
        const server = HttpServer.make({
          address: NetAddress.inetAddressFromStringUnsafe(input),
          serve: () => Effect.void
        })
        const client = HttpClient.make((request, url) => {
          assert.strictEqual(url.origin, expected)
          return Effect.succeed(HttpClientResponse.fromWeb(request, new Response()))
        })
        const testClient = yield* HttpServer.makeTestClient.pipe(
          Effect.provideService(HttpServer.HttpServer, server),
          Effect.provideService(HttpClient.HttpClient, client)
        )
        yield* testClient.get("/")
      }
    }))

  it.effect("rejects scoped IPv6 test server addresses before making requests", () =>
    Effect.gen(function*() {
      for (const input of ["[fe80::1%2]:3000", "[::%2]:3000"]) {
        const server = HttpServer.make({
          address: NetAddress.inetAddressFromStringUnsafe(input),
          serve: () => Effect.void
        })
        const client = HttpClient.make(() => Effect.die("unexpected request"))
        const exit = yield* HttpServer.makeTestClient.pipe(
          Effect.provideService(HttpServer.HttpServer, server),
          Effect.provideService(HttpClient.HttpClient, client),
          Effect.exit
        )
        if (Exit.isSuccess(exit)) assert.fail("expected scoped address rejection")
        const error = Cause.squash(exit.cause)
        assert.instanceOf(error, Error)
        assert.strictEqual(error.message, "HttpServer.makeTestClient: scoped IPv6 addresses are not supported")
      }
    }))
})
