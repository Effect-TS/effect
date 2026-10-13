import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import { assert, describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as Dgram from "node:dgram"

const unusedUdpPort = Effect.promise(() =>
  new Promise<number>((resolve) => {
    const socket = Dgram.createSocket("udp4")
    socket.bind(0, "127.0.0.1", () => {
      const { port } = socket.address()
      socket.close(() => resolve(port))
    })
  })
)

describe("NodeDnsClient", () => {
  it.live("reports name servers without a UDP listener as Refused", () =>
    Effect.gen(function*() {
      const port = yield* unusedUdpPort
      const client = yield* NodeDnsClient.make({ nameServers: [`127.0.0.1:${port}`], timeout: "2 seconds" })
      const error = yield* Effect.flip(client.query("example.test", "A"))
      assert.strictEqual(error.reason, "Refused")
    }))

  it.effect("rejects invalid name servers and search domains, and name servers with a scope ID", () =>
    Effect.gen(function*() {
      for (
        const options of [
          { nameServers: ["ns.example"] },
          { nameServers: ["fe80::1%1"] },
          { search: ["bad..name"] }
        ]
      ) {
        const error = yield* Effect.flip(NodeDnsClient.make(options))
        assert.strictEqual(error._tag, "NetAddressError")
      }
      const error = yield* Effect.flip(NodeDnsClient.makeTransportTcp({ nameServers: ["fe80::1%1"] }))
      assert.strictEqual(error._tag, "NetAddressError")
    }))

  it.effect("accepts parsed resolv.conf files and a hosts table", () =>
    Effect.gen(function*() {
      const client = yield* NodeDnsClient.make({
        ...DnsClient.parseResolvConf("nameserver 192.0.2.1\nsearch Corp.Example\noptions ndots:2 no-aaaa\n"),
        hosts: Host.parseHostsFile("192.0.2.9 db\n")
      })
      assert.deepStrictEqual<ReadonlyArray<string>>(client.search, ["corp.example"])
      assert.strictEqual(client.ndots, 2)
      assert.isTrue(client.noAaaa)
      assert.deepStrictEqual(client.hosts.get("db" as Host.DomainName)?.map(NetAddress.formatIp), ["192.0.2.9"])
    }))

  it.effect("clamps numeric options to their valid ranges", () =>
    Effect.gen(function*() {
      // Unclamped values would be rejected by the transports and the client.
      const client = yield* NodeDnsClient.make({ ndots: 20, attempts: 0, timeout: Duration.zero, udpPayloadSize: 100 })
      assert.strictEqual(client.ndots, 15)
      yield* NodeDnsClient.make({ ndots: -1, attempts: Number.NaN, udpPayloadSize: 1e6, useTcp: true })
    }))
})
