import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import { assert, describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as NetAddress from "effect/net/NetAddress"

const scoped = NetAddress.inetAddressFromStringUnsafe("[fe80::1%1]:53")
const global = NetAddress.inetAddressFromStringUnsafe("192.0.2.53:53")

// A file system holding only `files`; other paths are not found.
const files = (contents: Record<string, string>) => {
  const missing = FileSystem.makeNoop({})
  return FileSystem.layerNoop({
    readFileString: (path) => path in contents ? Effect.succeed(contents[path]) : missing.readFileString(path)
  })
}

describe("NodeDnsClient", () => {
  it.effect("rejects invalid name servers and name servers with a scope ID", () =>
    Effect.gen(function*() {
      const effects: ReadonlyArray<Effect.Effect<unknown, NetAddress.NetAddressError>> = [
        NodeDnsClient.makeTransportUdp({ nameServers: [global, scoped] }),
        NodeDnsClient.makeTransportTcp({ nameServers: [scoped] }),
        NodeDnsClient.make({ nameServers: [scoped] }),
        NodeDnsClient.makeTransportUdp({ nameServers: ["fe80::1%1"] }),
        NodeDnsClient.makeTransportTcp({ nameServers: ["192.0.2.53", "ns.example"] }),
        NodeDnsClient.make({ nameServers: ["ns.example"] })
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
      const fromStrings = yield* NodeDnsClient.makeTransportTcp({ nameServers: ["192.0.2.53", "[2001:db8::53]:5353"] })
      assert.strictEqual(fromStrings.servers.length, 2)
    }))

  it.effect("reads the system configuration with the FileSystem service", () =>
    Effect.gen(function*() {
      const config = yield* NodeDnsClient.systemOptions({ attempts: 3 }).pipe(
        Effect.provide(files({
          "/etc/resolv.conf":
            "nameserver 192.0.2.1\nnameserver fe80::1%2\nsearch corp.example\noptions ndots:2 attempts:4 timeout:3\n",
          "/etc/hosts": "192.0.2.9 db\n"
        }))
      )
      assert.deepStrictEqual(
        config.nameServers.map((server) => NetAddress.formatInet(server as NetAddress.InetAddress)),
        [
          "192.0.2.1:53"
        ]
      )
      assert.deepStrictEqual<ReadonlyArray<string> | undefined>(config.search, ["corp.example"])
      assert.strictEqual(config.ndots, 2)
      assert.strictEqual(config.attempts, 3)
      assert.deepStrictEqual(config.timeout, Duration.seconds(3))
      const hosts = yield* config.hosts!
      assert.deepStrictEqual(hosts.get("db" as never)?.map(NetAddress.formatIp), ["192.0.2.9"])
    }))

  it.effect("uses the local name servers when the files are missing", () =>
    Effect.gen(function*() {
      const config = yield* NodeDnsClient.systemOptions().pipe(Effect.provide(files({})))
      assert.deepStrictEqual(
        config.nameServers.map((server) => NetAddress.formatInet(server as NetAddress.InetAddress)),
        [
          "127.0.0.1:53",
          "[::1]:53"
        ]
      )
      assert.strictEqual((yield* config.hosts!).size, 0)
    }))
})
