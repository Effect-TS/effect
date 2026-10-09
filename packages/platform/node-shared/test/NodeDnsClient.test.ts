import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as NetAddress from "effect/net/NetAddress"

const scoped = NetAddress.inetAddressFromStringUnsafe("[fe80::1%1]:53")
const global = NetAddress.inetAddressFromStringUnsafe("192.0.2.53:53")

describe("NodeDnsClient", () => {
  it.effect("rejects name servers with a scope ID", () =>
    Effect.gen(function*() {
      const effects: ReadonlyArray<Effect.Effect<unknown, NetAddress.NetAddressError>> = [
        NodeDnsClient.makeTransportUdp({ nameServers: [global, scoped] }),
        NodeDnsClient.makeTransportTcp({ nameServers: [scoped] }),
        NodeDnsClient.make({ nameServers: [scoped] })
      ]
      for (const effect of effects) {
        const error = yield* Effect.flip(effect)
        assert.strictEqual(error._tag, "NetAddressError")
      }
    }))

  it.effect("creates transports with one entry per name server", () =>
    Effect.gen(function*() {
      const transport = yield* NodeDnsClient.makeTransportUdp({ nameServers: [global, NetAddress.ipv4Loopback] })
      assert.strictEqual(transport.servers.length, 2)
    }))
})
