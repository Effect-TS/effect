import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
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

  it("formats scoped IPv6 addresses as valid URLs", () => {
    const address = NetAddress.inetAddressFromStringUnsafe("[fe80::1%2]:3000")
    const formatted = HttpServer.formatAddress(address)
    assert.strictEqual(formatted, "http://[fe80::1]:3000")
    assert.doesNotThrow(() => new URL(formatted))
  })

  it.effect("uses IPv4 loopback for unspecified test server addresses", () => {
    const server = HttpServer.make({
      address: NetAddress.inetAddressUnsafe(NetAddress.ipv6Unspecified, 3000),
      serve: () => Effect.void
    })
    const client = HttpClient.make((request, url) => {
      assert.strictEqual(url.origin, "http://127.0.0.1:3000")
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response()))
    })

    return Effect.gen(function*() {
      const testClient = yield* HttpServer.makeTestClient
      yield* testClient.get("/")
    }).pipe(
      Effect.provideService(HttpServer.HttpServer, server),
      Effect.provideService(HttpClient.HttpClient, client)
    )
  })
})
