import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as HttpServer from "effect/unstable/http/HttpServer"
import * as NetAddress from "effect/unstable/net/NetAddress"

describe("HttpServer", () => {
  it("normalizes socket address input", () => {
    const server = HttpServer.make({
      address: { address: "127.0.0.1", port: 8080 },
      serve: () => Effect.void
    })

    assert.isTrue(NetAddress.isInetAddressV4(server.address))
    assert.strictEqual(NetAddress.formatSocketAddress(server.address), "127.0.0.1:8080")
  })
})
